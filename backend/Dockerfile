FROM node:20-alpine

WORKDIR /app

# Necessário para verificações ICMP/PING dentro do container
RUN apk add --no-cache iputils

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3001

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
