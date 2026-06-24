#!/bin/sh
set -e

if [ "${RUN_PRISMA_GENERATE:-true}" = "true" ]; then
  npx prisma generate
fi

SHOULD_RUN_MIGRATIONS="${RUN_DB_MIGRATIONS:-}"

if [ -z "$SHOULD_RUN_MIGRATIONS" ]; then
  if [ "${NODE_ENV:-}" = "production" ]; then
    SHOULD_RUN_MIGRATIONS="true"
  else
    SHOULD_RUN_MIGRATIONS="false"
  fi
fi

if [ "$SHOULD_RUN_MIGRATIONS" = "true" ]; then
  npm run prisma:migrate:deploy
fi

exec "$@"
