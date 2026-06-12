#!/bin/sh
set -e

if [ "${RUN_PRISMA_GENERATE:-true}" = "true" ]; then
  npx prisma generate
fi

if [ "${RUN_DB_MIGRATIONS:-false}" = "true" ]; then
  npm run prisma:migrate:deploy
fi

exec "$@"
