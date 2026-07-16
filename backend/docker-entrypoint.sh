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
  echo "Primeira execução: populando dados de demonstração..."
  npm run seed
fi

# Garante que o login inicial exista mesmo quando um volume antigo ou
# parcialmente inicializado já estiver presente.
npm run ensure-admin

exec npm run start
