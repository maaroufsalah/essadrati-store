#!/bin/sh
# Runs pending database migrations before starting Medusa, when enabled.
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] running database migrations"
  npx medusa db:migrate
fi

exec "$@"
