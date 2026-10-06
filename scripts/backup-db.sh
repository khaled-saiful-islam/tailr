#!/usr/bin/env bash
# Back up production: the database and the uploaded/generated files.
# Runs on the server, nightly from cron and before every deploy:
#
#   cd /opt/tailr && scripts/backup-db.sh
#
# Writes backups/tailr-<UTC time>.dump (pg_dump custom format) and
# backups/files-<UTC time>.tar.gz, and keeps the newest KEEP_BACKUPS of each.
# Restoring is in docs/deployment.md.
set -euo pipefail
cd "$(dirname "$0")/.."

compose=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
keep="${KEEP_BACKUPS:-14}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p backups
chmod 700 backups

# Written to .part first, so a failed dump never looks like a good one.
db="backups/tailr-$stamp.dump"
# shellcheck disable=SC2016  # expanded inside the container, from its own environment
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$db.part"
mv "$db.part" "$db"

# A one-off container mounts the files volume, so this works even when the
# backend is down (a failed start must not block the deploy that fixes it).
files="backups/files-$stamp.tar.gz"
"${compose[@]}" run --rm --no-deps -T --entrypoint tar backend -czf - -C /srv/data files >"$files.part"
mv "$files.part" "$files"

echo "backup: $db ($(du -h "$db" | cut -f1)), $files ($(du -h "$files" | cut -f1))"

prune() {
  # Newest first; delete everything after the first $keep.
  find backups -maxdepth 1 -name "$1" -type f -print0 \
    | xargs -0 -r ls -1t \
    | tail -n +"$((keep + 1))" \
    | xargs -r rm --
}
prune 'tailr-*.dump'
prune 'files-*.tar.gz'
