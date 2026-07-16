FROM node:20-alpine AS builder

WORKDIR /app

# Variável de build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm install

COPY . .

# Faz o build de produção do Next.js
RUN npm run build

# Imagem final de produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# O standalone output cria um server.js
CMD ["node", "server.js"]
