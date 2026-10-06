#!/usr/bin/env bash
# Bring production up to date with GitHub main. `make deploy` runs this over SSH;
# by hand on the server it is:
#
#   cd /opt/tailr && scripts/deploy.sh
#
# The API migrates the database when it starts, so a backup is taken first.
# Expect a minute or two of downtime while the new containers start; work that
# is running in the background at that moment is cut off, so deploy when the
# app is quiet.
set -euo pipefail

compose=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

# Everything runs from main(): bash reads a script as it goes, and `git pull`
# below may replace this very file. A function is read in full before it runs.
main() {
  cd "$(dirname "$0")/.."

  if [ ! -s .env ]; then
    echo "deploy: missing .env. Create it with scripts/prod-env.sh (docs/deployment.md)." >&2
    exit 1
  fi

  if [ -n "$("${compose[@]}" ps --status running --quiet db 2>/dev/null)" ]; then
    scripts/backup-db.sh
  else
    echo "deploy: the database isn't running yet (first deploy?), so no backup this time"
  fi

  local before
  before="$(git rev-parse HEAD)"
  git pull --ff-only
  echo "deploy: $(git log --oneline -1)"

  # A first start builds every image and runs every migration; give it time.
  "${compose[@]}" up -d --build --remove-orphans --wait --wait-timeout 600

  # Files under deploy/ are mounted one by one. git replaces a changed file
  # instead of editing it, so a running container keeps reading the old copy,
  # and `up` sees nothing to recreate. A restart mounts the new one.
  if ! git diff --quiet "$before" HEAD -- deploy/; then
    echo "deploy: deploy/ changed, restarting nginx and Caddy to load it"
    "${compose[@]}" restart frontend caddy
    "${compose[@]}" up -d --wait --wait-timeout 120 frontend caddy
  fi

  # Each build leaves the previous images behind; they add up on the disk.
  docker image prune -f >/dev/null
  "${compose[@]}" ps --format 'table {{.Name}}\t{{.Status}}'
}

main "$@"
