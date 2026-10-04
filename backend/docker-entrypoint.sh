#!/usr/bin/env sh
# Only the API container migrates (RUN_MIGRATIONS=1); workers start after it is healthy.
set -e
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "Applying database migrations..."
  alembic upgrade head
fi
exec "$@"
