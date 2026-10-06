#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for Tailr. Safe to run again.
# `make prod-setup` streams it over SSH; it runs as the login user (ubuntu)
# and uses sudo where it must.
#
# 1. Opens ports 80 and 443 in the server's own firewall (Oracle's Ubuntu
#    images reject everything except SSH, on top of the cloud firewall).
# 2. Installs Docker from Docker's apt repository and caps container logs.
# 3. Clones the repo to /opt/tailr.
# 4. Schedules a nightly backup (scripts/backup-db.sh) at 03:17 Malaysia time.
set -euo pipefail

REPO="${REPO:-https://github.com/khaled-saiful-islam/tailr.git}"
DIR="${DIR:-/opt/tailr}"

main() {
  open_web_ports
  install_docker
  clone_repo
  schedule_backups
  echo
  echo "server-setup: done. Next: create .env with scripts/prod-env.sh, then make deploy."
}

# Rules go into the saved rule file (so they survive reboots) and into the live
# table. The rest of the file is left alone: saving the live table instead
# would also save Docker's own rules, which then clash with Docker on boot.
open_web_ports() {
  local rules=/etc/iptables/rules.v4
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent >/dev/null
  local spec
  for spec in "tcp 80" "tcp 443" "udp 443"; do
    # shellcheck disable=SC2086  # "tcp 80" → protocol and port
    set -- $spec
    local rule="-p $1 -m state --state NEW -m $1 --dport $2 -j ACCEPT"
    if sudo test -f "$rules" && ! sudo grep -q -- "-A INPUT $rule" "$rules"; then
      # Above the SSH rule, so it sits before the final REJECT.
      sudo sed -i "0,/^-A INPUT .*--dport 22 .*-j ACCEPT/s//-A INPUT $rule\n&/" "$rules"
    fi
    # shellcheck disable=SC2086
    sudo iptables -C INPUT $rule 2>/dev/null || sudo iptables -I INPUT $rule
  done
  echo "server-setup: ports 80 and 443 open"
}

install_docker() {
  if ! command -v docker >/dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    # shellcheck disable=SC1091
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
      docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  fi
  # Without a cap, container logs grow until the disk is full.
  if [ ! -f /etc/docker/daemon.json ]; then
    echo '{"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}}' \
      | sudo tee /etc/docker/daemon.json >/dev/null
    sudo systemctl restart docker
  fi
  sudo usermod -aG docker "$USER"
  echo "server-setup: $(sudo docker --version), $(sudo docker compose version)"
}

clone_repo() {
  if [ ! -d "$DIR/.git" ]; then
    sudo install -d -o "$USER" -g "$USER" "$DIR"
    git clone -q "$REPO" "$DIR"
  fi
  echo "server-setup: repo at $DIR ($(git -C "$DIR" log --oneline -1))"
}

schedule_backups() {
  # The server clock is UTC: 19:17 UTC is 03:17 in Malaysia, when nobody is using it.
  echo "17 19 * * * $USER cd $DIR && scripts/backup-db.sh >> $DIR/backups/backup.log 2>&1" \
    | sudo tee /etc/cron.d/tailr-backup >/dev/null
  mkdir -p "$DIR/backups"
  chmod 700 "$DIR/backups"
  echo "server-setup: nightly backup scheduled (03:17 Malaysia time)"
}

main "$@"
