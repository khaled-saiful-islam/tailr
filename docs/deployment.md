# Deploying Tailr

Tailr runs in production on one small Linux server with Docker, the same containers as
`make up` plus [Caddy](https://caddyserver.com) in front for HTTPS. Day to day you ship with one
command:

```bash
git push origin main
make deploy
```

This page is the whole setup, from an empty cloud account to a live site, with the reason
for each step, so you can repeat it on any server.

## What production looks like

```
visitor ──HTTPS──▶ Caddy :443 ──▶ nginx (frontend) ──▶ app pages
                   (certificate,       │
                    HTTP → HTTPS)      └──/api──▶ backend ──▶ Postgres, Redis, renderer
                                                  worker, scheduler (background work)
```

| Piece | Where | Why |
|---|---|---|
| Server | Oracle Cloud (OCI), `ap-singapore-1`, Ampere A1 (Arm), up to 4 cores and 24 GB RAM, 100 GB disk, Ubuntu 24.04 | Inside Oracle's **Always Free** allowance, so it costs nothing; Singapore is close to Malaysian users. Tailr itself needs about 1 GB, and any x86 server works too |
| Address | `SITE_ADDRESS` in the server's `.env` | Until a domain is bought, a free [sslip.io](https://sslip.io) name for the server's IP (`203-0-113-7.sslip.io`); later `tailr.stream` |
| HTTPS | Caddy, certificate from Let's Encrypt | Free, and Caddy renews it by itself |
| Code | `/opt/tailr`, a clone of GitHub's `main` | `make deploy` ships exactly what GitHub has, so the server never runs code that isn't in the repo |
| Secrets | `/opt/tailr/.env`, only on the server | Never in git; created once by `scripts/prod-env.sh` |
| Backups | `/opt/tailr/backups`, nightly at 03:17 Malaysia time and before every deploy | The last 14 database dumps and file archives |

Only ports 80 and 443 are open to the internet, plus SSH (22) from the owner's IP. The
database, Redis and the API publish no ports (`docker-compose.prod.yml`).

### Staying free

Everything here is on Oracle's [Always Free list](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm):

| Resource | Used | Always Free allowance |
|---|---|---|
| Arm VM (A1 Flex) | up to 4 cores, 24 GB | 4 cores, 24 GB in total |
| Boot disk | 100 GB | 200 GB in total |
| Network, firewall, gateway | 1 each | Free |
| Reserved public IP | 1 | Free (1 on Always Free) |
| Outbound traffic | small | 10 TB a month |

Don't add a second VM bigger than what's left of the allowance, raise the disk's performance
setting, or pick a non-A1 shape: those are billed.

On an Always Free account (not upgraded to Pay As You Go) Oracle may reclaim a VM that stays
almost idle for 7 days. Upgrading the account stops that and still costs nothing as long as
you stay inside the allowance.

## One-time setup

You need: the [OCI CLI](https://docs.oracle.com/iaas/Content/API/SDKDocs/cliinstall.htm)
signed in (`brew install oci-cli`, then `oci setup bootstrap`), and an SSH key for the server:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tailr-oci -N '' -C tailr-prod
```

### 1. Network

A private network (VCN) with one public subnet, a gateway to the internet, and a firewall
that lets in only HTTP, HTTPS and your SSH.

```bash
T=$(grep '^tenancy=' ~/.oci/config | cut -d= -f2)    # the account's root compartment

oci network vcn create --compartment-id "$T" --cidr-blocks '["10.0.0.0/16"]' \
  --display-name tailr-vcn --dns-label tailr --wait-for-state AVAILABLE
# Note data.id (VCN) and data."default-route-table-id" (RT).

oci network internet-gateway create --compartment-id "$T" --vcn-id "$VCN" \
  --is-enabled true --display-name tailr-igw --wait-for-state AVAILABLE   # → IGW

# Send all outbound traffic through the gateway.
oci network route-table update --rt-id "$RT" --force --route-rules \
  "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW\"}]"
```

The firewall (a security list). SSH only from your own IP (`curl ifconfig.me`); 80 must be
open to everyone because Let's Encrypt checks the site over HTTP before issuing a
certificate.

```bash
cat > ingress.json <<'EOF'
[
 {"protocol":"6","source":"<your-ip>/32","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
 {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
 {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
 {"protocol":"1","source":"0.0.0.0/0","icmpOptions":{"type":3,"code":4}},
 {"protocol":"1","source":"10.0.0.0/16","icmpOptions":{"type":3}}
]
EOF
echo '[{"protocol":"all","destination":"0.0.0.0/0"}]' > egress.json

oci network security-list create --compartment-id "$T" --vcn-id "$VCN" --display-name tailr-web \
  --ingress-security-rules file://ingress.json --egress-security-rules file://egress.json \
  --wait-for-state AVAILABLE                                                   # → SL

oci network subnet create --compartment-id "$T" --vcn-id "$VCN" --cidr-block 10.0.0.0/24 \
  --display-name tailr-public --dns-label public --route-table-id "$RT" \
  --security-list-ids "[\"$SL\"]" --wait-for-state AVAILABLE                   # → SUBNET
```

If your home IP changes, SSH stops connecting: update the first rule (`oci network
security-list update`, or the console under Networking → Virtual cloud networks → tailr-vcn
→ Security).

### 2. Server

The newest Ubuntu 24.04 image for Arm, then the VM. It starts without a public IP; a
reserved one is attached next, so the address survives even if the VM is rebuilt.

```bash
IMAGE=$(oci compute image list --compartment-id "$T" --operating-system "Canonical Ubuntu" \
  --operating-system-version 24.04 --shape VM.Standard.A1.Flex --sort-by TIMECREATED \
  --sort-order DESC --limit 1 --query 'data[0].id' --raw-output)
AD=$(oci iam availability-domain list --query 'data[0].name' --raw-output)

oci compute instance launch --compartment-id "$T" --availability-domain "$AD" \
  --display-name tailr-prod --hostname-label tailr-prod \
  --shape VM.Standard.A1.Flex --shape-config '{"ocpus":4,"memoryInGBs":24}' \
  --image-id "$IMAGE" --boot-volume-size-in-gbs 100 \
  --subnet-id "$SUBNET" --assign-public-ip false \
  --ssh-authorized-keys-file ~/.ssh/tailr-oci.pub --wait-for-state RUNNING     # → INSTANCE

VNIC=$(oci compute instance list-vnics --instance-id "$INSTANCE" --query 'data[0].id' --raw-output)
PRIVATE_IP=$(oci network private-ip list --vnic-id "$VNIC" --query 'data[0].id' --raw-output)
oci network public-ip create --compartment-id "$T" --lifetime RESERVED \
  --private-ip-id "$PRIVATE_IP" --display-name tailr-ip --query 'data."ip-address"' --raw-output
```

"Out of host capacity" when launching is common for free Arm VMs: try again later, or with
2 cores and 12 GB (resize up later from the console).

### 3. Point `make` at the server

```bash
cp .env.deploy.example .env.deploy
```

Fill in the IP. The sslip.io name is the IP with dashes: `203.0.113.7` → `203-0-113-7.sslip.io`.

```bash
DEPLOY_HOST=ubuntu@203.0.113.7
DEPLOY_KEY=~/.ssh/tailr-oci
DEPLOY_DIR=/opt/tailr
DEPLOY_URL=https://203-0-113-7.sslip.io
```

`.env.deploy` stays out of git: the repo is public, and there's no reason to publish the
server's address next to the code.

### 4. Prepare the server

```bash
make prod-setup
```

It runs [`scripts/server-setup.sh`](../scripts/server-setup.sh) over SSH, and is safe to run again:

| Step | Why |
|---|---|
| Opens 80 and 443 in the server's own firewall | Oracle's Ubuntu images reject everything except SSH, on top of the cloud firewall |
| Installs Docker from Docker's apt repository | The containers are the whole app; Ubuntu's own Docker package is older |
| Caps container logs at 3 × 10 MB | Otherwise logs grow until the disk fills |
| Clones the repo to `/opt/tailr` | `make deploy` updates this clone |
| Schedules a nightly backup at 03:17 Malaysia time | So a bad day never costs more than a day |

### 5. Create the production settings

On the server, once. The ILMU key is read from stdin, so it never lands in the shell history:

```bash
make prod-ssh
cd /opt/tailr
read -rs KEY && printf '%s\n' "$KEY" | scripts/prod-env.sh 203-0-113-7.sslip.io; unset KEY
```

[`scripts/prod-env.sh`](../scripts/prod-env.sh) copies [`.env.production.example`](../.env.production.example)
to `.env` and fills in the address, a new `SECRET_KEY`, a database password and an admin
password, which it prints once: **put it in a password manager**. The API refuses to start in
production with default secrets, the default admin password, insecure cookies, no AI key, or
email pointed at the development mailbox.

Email is off (`EMAIL_ENABLED=false`) until the domain has a mail provider; see
[Turning on email](#turning-on-email).

### 6. First deploy

```bash
make deploy
```

The first one builds every image on the server (about 10 minutes on 4 Arm cores) and
creates the database. Caddy then asks Let's Encrypt for the certificate, which takes a few
seconds. Open `DEPLOY_URL` and sign in as `admin` with the printed password.

## Everyday

| Command | Does |
|---|---|
| `make deploy` | Checks your checkout is GitHub's `main`, then on the server: backs up, pulls, rebuilds what changed, restarts, prunes old images, and checks `/api/health` |
| `make prod-status` | Containers, free disk, latest backups |
| `make prod-logs` / `make prod-logs s=backend` | Follow the logs |
| `make prod-deploy-log` | The latest deploy's log (kept on the server in `logs/`, last 20) |
| `make prod-backup` | Back up now |
| `make prod-ssh` | A shell on the server |

`make deploy` refuses to run if your checkout isn't GitHub's `main`, because the server pulls
from GitHub: push first. The deploy runs on the server in its own session and writes a log;
`make deploy` only follows it. If your connection drops, the deploy still finishes, and
`make prod-deploy-log` shows how it ended. Only one deploy runs at a time. Expect a minute or two of downtime near the end while the new
containers start, and background work that is running at that moment is cut off, so deploy
when it's quiet.

After a change under `deploy/` (Caddy or nginx config), the deploy restarts nginx and Caddy
itself; git replaces those files rather than editing them, so the running containers would
otherwise keep the old copy.

## Backups and restoring

[`scripts/backup-db.sh`](../scripts/backup-db.sh) writes two files to `/opt/tailr/backups`:

- `tailr-<time>.dump`: the database (`pg_dump` custom format)
- `files-<time>.tar.gz`: uploaded and generated files (CVs, pictures, PDFs)

It keeps the newest 14 of each (`KEEP_BACKUPS`). The backups live on the same disk as the
app, so also copy one off the server now and then:

```bash
scp -i ~/.ssh/tailr-oci 'ubuntu@203.0.113.7:/opt/tailr/backups/*' ~/tailr-backups/
```

To restore (on the server, in `/opt/tailr`):

```bash
P="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$P stop backend worker scheduler
$P exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < backups/tailr-<time>.dump
$P run --rm --no-deps -T --entrypoint sh backend -c 'rm -rf /srv/data/files/* && tar -xzf - -C /srv/data' \
  < backups/files-<time>.tar.gz
$P up -d --wait
```

## Moving to a new server

For moving to a bigger or free server, or rebuilding after losing one. The reserved IP moves
with the site, so the address, `.env.deploy` and any DNS record stay the same. Expect about
half an hour of downtime.

1. **Create the new server** as in [step 2](#2-server), without a public IP (`NEW` below is
   its instance OCID).
2. **Stop writes, take a last backup, and copy it and `.env` to your Mac.** The old server is
   unreachable once its IP moves, and the new one needs the same secrets for the backup:

   ```bash
   ssh -i ~/.ssh/tailr-oci ubuntu@<ip> 'cd /opt/tailr &&
     docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend worker scheduler &&
     scripts/backup-db.sh'
   mkdir -p ~/tailr-move
   scp -i ~/.ssh/tailr-oci ubuntu@<ip>:/opt/tailr/.env 'ubuntu@<ip>:/opt/tailr/backups/*' ~/tailr-move/
   ```

3. **Move the IP** to the new server, and forget the old server's SSH fingerprint:

   ```bash
   VNIC=$(oci compute instance list-vnics --instance-id "$NEW" --query 'data[0].id' --raw-output)
   NEW_PRIVATE_IP=$(oci network private-ip list --vnic-id "$VNIC" --query 'data[0].id' --raw-output)
   PUBIP=$(oci network public-ip get --public-ip-address <ip> --query 'data.id' --raw-output)
   oci network public-ip update --public-ip-id "$PUBIP" --private-ip-id "$NEW_PRIVATE_IP"
   ssh-keygen -R <ip>
   ```

4. **Set it up with the same settings**, then deploy (this creates an empty database):

   ```bash
   make prod-setup
   scp -i ~/.ssh/tailr-oci ~/tailr-move/.env ubuntu@<ip>:/opt/tailr/.env
   ssh -i ~/.ssh/tailr-oci ubuntu@<ip> chmod 600 /opt/tailr/.env
   make deploy
   ```

5. **Restore the backup**: copy the newest `tailr-*.dump` and `files-*.tar.gz` from
   `~/tailr-move` to `/opt/tailr/backups/` on the new server (`scp`), then follow
   [Backups and restoring](#backups-and-restoring).
6. **Check the site, then delete the old server** (its disk goes with it):

   ```bash
   oci compute instance terminate --instance-id <old-instance> --preserve-boot-volume false --force
   ```

## Moving to tailr.stream

When the domain is bought:

1. **DNS.** Add an `A` record for `tailr.stream` pointing at the server's IP. If the domain
   is on Cloudflare, start with the record set to **DNS only** (grey cloud), so Caddy can get
   its certificate directly.
2. **Settings.** On the server, edit `/opt/tailr/.env`:
   `SITE_ADDRESS=tailr.stream`, `PUBLIC_WEB_URL=https://tailr.stream`,
   `CORS_ORIGINS=https://tailr.stream`.
3. **Apply.** `cd /opt/tailr && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --wait`
   recreates the containers whose settings changed; Caddy fetches the new certificate.
4. **Local.** Update `DEPLOY_URL` in `.env.deploy`.

Links shared with the sslip.io address stop working after the switch, so do it before
sharing Tailr widely.

Putting Cloudflare's proxy (orange cloud) in front later is optional. If you do: set
Cloudflare SSL to **Full (strict)**, keep Caddy's certificate, add Cloudflare's IP ranges as
`trusted_proxies` in `deploy/Caddyfile` (otherwise every visitor looks like Cloudflare to the
rate limits), and narrow ports 80/443 in the OCI security list to Cloudflare's ranges.

## Turning on email

Tailr sends the daily jobs email, reminders and contact-form messages over SMTP. Email needs
the domain, because providers only deliver mail from a domain that proves it's allowed to
send (SPF and DKIM records).

1. Pick a provider (Amazon SES, Resend, Brevo, Postmark…), verify `tailr.stream` with it and
   add the DNS records it gives you.
2. In `/opt/tailr/.env`: `EMAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY`
   (`starttls` on 587, `ssl` on 465), `SMTP_USERNAME`, `SMTP_PASSWORD`, and
   `SMTP_FROM=Tailr <hello@tailr.stream>`.
3. Apply as in step 3 above.

## When something is wrong

| Symptom | Look at |
|---|---|
| `make deploy` can't connect | Your IP changed: update the SSH rule in the security list |
| Site doesn't load at all | `make prod-status`; then `make prod-logs s=caddy` |
| Certificate errors | `make prod-logs s=caddy`: port 80 must be reachable from the internet, and DNS must point at the server |
| API won't start | `make prod-logs s=backend`: an "Unsafe production config" line names the setting to fix |
| Job searches find nothing | Admin → job-site health; a site may be slowing down or blocking the server's IP |
| Disk filling up | `make prod-status`; old images are pruned on deploy, backups keep 14 of each |
