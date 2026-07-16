# Guia de Instalação e Deploy - PingAlert Pro

Este documento descreve como preparar o PingAlert Pro para um ambiente de produção (por exemplo, uma VPS com Ubuntu e Docker ou gerenciador de processos PM2).

## Preparação do Servidor (Recomendado)
Recomenda-se um servidor Linux (Ubuntu 22.04 LTS ou Debian 11) com pelo menos:
- 2 vCPUs
- 2 GB de RAM (O motor de Next.js pode consumir RAM durante o build)
- Node.js versão 18+ ou 20+ instalada
- PM2 para gerenciamento de processos (se não utilizar Docker)

## 1. Migrando do SQLite para PostgreSQL (Produção)
O projeto atual está usando `sqlite` para facilitar o desenvolvimento. Em produção, para suporte a alto volume de escritas assíncronas do monitoramento, **você deve migrar para o PostgreSQL**.

**Passos:**
1. Instale o banco de dados PostgreSQL na sua VPS.
2. Edite o arquivo `backend/prisma/schema.prisma` e mude o provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. No arquivo `.env` da raiz e do `/backend`, atualize a conexão:
   `DATABASE_URL="postgresql://usuario:senha@localhost:5432/pingalert?schema=public"`
4. Gere o client do prisma e faça a migração inicial da estrutura:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   ```

## 2. Configuração de Variáveis de Ambiente (.env)

Você deve configurar as variáveis de produção no arquivo `.env` localizado na raiz do Backend e do Frontend:

### Backend (`/backend/.env`)
```ini
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://usuario:senha@localhost:5432/pingalert?schema=public"
JWT_SECRET="SuaChaveSecretaMuitoLongaESeguraAqui"
FRONTEND_URL="https://app.seusite.com.br"

# Telegram Bot Token (Pegue no BotFather)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
```

### Frontend (`/frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL="https://api.seusite.com.br/api"
```

## 3. Fazendo o Build para Produção

O projeto foi construído usando TypeScript. Você precisa compilar o backend e otimizar o frontend.

### Backend
```bash
cd backend
npm install
npm run build
```
*(Isso gerará os arquivos JavaScript na pasta `/backend/dist`)*

### Frontend
```bash
cd frontend
npm install
npm run build
```
*(Isso gerará o build de produção do Next.js na pasta `/frontend/.next`)*

## 4. Iniciando com PM2

O PM2 é um gerenciador de processos de produção para Node.js.

1. Instale o PM2 globalmente se não tiver:
   `npm install -g pm2`

2. Inicie a API e o Motor de Monitoramento (Backend):
   ```bash
   cd backend
   pm2 start dist/index.js --name "pingalert-api"
   ```

3. Inicie o Servidor Next.js (Frontend):
   ```bash
   cd frontend
   pm2 start npm --name "pingalert-front" -- run start
   ```

4. Configure para iniciar com o servidor (Opcional):
   ```bash
   pm2 startup
   pm2 save
   ```

## 5. Proxy Reverso com NGINX e SSL

Recomenda-se colocar a aplicação atrás de um servidor NGINX. 

Exemplo de configuração básica de block no NGINX para apontar o subdomínio `app.seusite.com.br` para o Frontend e `api.seusite.com.br` para o Backend.

```nginx
# Configuração para o Frontend (Porta 3000)
server {
    server_name app.seusite.com.br;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Configuração para o Backend (Porta 3001)
server {
    server_name api.seusite.com.br;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Após isso, use o `certbot` para instalar certificados SSL gratuitos da Let's Encrypt.
