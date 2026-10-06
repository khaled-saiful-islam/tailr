#!/usr/bin/env bash
# Bring production up to date with GitHub main. `make deploy` runs this over SSH;
# by hand on the server it is:
#
#   cd /opt/tailr && scripts/deploy.sh
#
# The deploy itself runs in its own session and writes logs/deploy-<time>.log;
# this shell only follows the log. A dropped SSH connection therefore can't stop
# a deploy halfway (with containers mid-restart): it finishes on the server, and
# `make prod-deploy-log` shows how it ended. Only one deploy runs at a time.
#
# The API migrates the database when it starts, so a backup is taken first.
# Expect a minute or two of downtime while the new containers start; work that
# is running in the background at that moment is cut off, so deploy when the
# app is quiet.
set -euo pipefail

compose=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
self="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
keep_logs=20

# Everything runs from functions: bash reads a script as it goes, and `git pull`
# below may replace this very file. A function is read in full before it runs.
deploy() {
  cd "$(dirname "$self")/.."

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
  echo "deploy: done"
}

# The real deploy, in its own session (started by follow). The lock is held
# until it ends, so a second `make deploy` is refused instead of interleaving.
run() {
  exec 9>/tmp/tailr-deploy.lock
  if ! flock -n 9; then
    echo "deploy: another deploy is still running (make prod-deploy-log)" >&2
    exit 1
  fi
  deploy
}

follow() {
  cd "$(dirname "$self")/.."
  mkdir -p logs
  local log pid
  log="logs/deploy-$(date -u +%Y%m%dT%H%M%SZ).log"
  # setsid: a new session, so the hang-up from a dropped connection never reaches it.
  setsid --wait nohup "$self" --run >"$log" 2>&1 </dev/null &
  pid=$!
  tail -n +1 -f --pid="$pid" "$log"
  local status=0
  wait "$pid" || status=$?
  find logs -maxdepth 1 -name 'deploy-*.log' -type f -print0 \
    | xargs -0 -r ls -1t | tail -n +"$((keep_logs + 1))" | xargs -r rm --
  return "$status"
}

case "${1:-}" in
  --run) run ;;
  *) follow ;;
esac
