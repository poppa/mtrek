#!/usr/bin/env sh
set -eu

echo "Env: ${VERCEL_ENV:-}"
echo "DB URL: ${POSTGRES_URL_NON_POOLING:-}"

if [ "${VERCEL_ENV:-}" = "production" ]; then
  : "${POSTGRES_URL_NON_POOLING:?Set POSTGRES_URL_NON_POOLING for Vercel Production}"
  npm run db:migrate
fi
