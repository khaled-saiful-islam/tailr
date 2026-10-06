#!/usr/bin/env bash
# Create the production .env on the server, once, with fresh secrets.
#
#   cd /opt/tailr && scripts/prod-env.sh <site-address> < ilmu-key.txt
#
# <site-address> is the public name without https://: tailr.stream, or a free
# sslip.io name for the server's IP (203-0-113-7.sslip.io) until a domain is
# bought. The ILMU key is read from stdin so it never appears in the shell
# history or the process list. The generated admin password is printed once;
# store it in a password manager.
set -euo pipefail
cd "$(dirname "$0")/.."

site="${1:-}"
if ! [[ "$site" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "usage: scripts/prod-env.sh <site-address, e.g. tailr.stream> < ilmu-key.txt" >&2
  exit 1
fi
if [ -e .env ]; then
  echo "prod-env: .env already exists; edit it instead (secrets must not change under a live database)." >&2
  exit 1
fi

read -r llm_key || true
if [ -z "${llm_key:-}" ]; then
  echo "prod-env: no ILMU key on stdin; AI features need one." >&2
  exit 1
fi

# Letters and digits only, so the values are safe in sed and in .env. The first
# head bounds the input; reading /dev/urandom straight into `head -c` would end
# tr with SIGPIPE, which pipefail turns into a failed script.
random() { head -c 4096 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | head -c "$1"; }
secret_key="$(random 64)"
db_password="$(random 32)"
admin_password="$(random 24)"

umask 077
# The key goes in last, as-is: sed would read characters such as & or | in it.
sed \
  -e "s|^SITE_ADDRESS=.*|SITE_ADDRESS=$site|" \
  -e "s|^PUBLIC_WEB_URL=.*|PUBLIC_WEB_URL=https://$site|" \
  -e "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://$site|" \
  -e "s|^SECRET_KEY=.*|SECRET_KEY=$secret_key|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$db_password|" \
  -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$admin_password|" \
  -e "/^LLM_API_KEY=/d" \
  .env.production.example >.env
printf 'LLM_API_KEY=%s\n' "$llm_key" >>.env

echo "prod-env: wrote .env for https://$site"
echo "prod-env: admin sign-in  admin / $admin_password"
