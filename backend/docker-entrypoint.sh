#!/bin/sh
set -e

DB_FILE="/app/prisma/data/pingalert.db"
FIRST_RUN=false

if [ ! -f "$DB_FILE" ]; then
  FIRST_RUN=true
fi

mkdir -p /app/prisma/data

npx prisma migrate deploy

if [ "$FIRST_RUN" = "true" ]; then
  echo "Primeira execução: populando banco de dados..."
  npm run seed
fi

exec npm run start
