FROM node:20-alpine

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia os arquivos do prisma
COPY prisma ./prisma/

# Gera o client do prisma
RUN npx prisma generate

# Copia o restante do código
COPY . .

# Compila o TypeScript
RUN npm run build

# Expõe a porta
EXPOSE 3001

# Script de inicialização para rodar as migrações e iniciar o servidor
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
