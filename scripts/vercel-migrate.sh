#!/usr/bin/env sh
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  : "${POSTGRES_URL_NON_POOLING:?Set POSTGRES_URL_NON_POOLING for Vercel Production}"
  npm run db:migrate
fi
