#!/bin/sh

# Roda as migrações do banco de dados (cria as tabelas se não existirem)
npx prisma migrate deploy

# Inicia o servidor backend
npm run start
