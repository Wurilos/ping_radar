# PingAlert Pro 📡

Sistema de monitoramento de equipamentos por PING/ICMP, HTTP, TCP e status OpenVPN, com dashboard Next.js, API Express, Prisma e alertas.

## Início rápido com Docker no Windows

Pré-requisitos:

- Docker Desktop iniciado;
- portas 3000 e 3001 livres.

Na raiz do projeto, execute:

```powershell
.\install.bat
```

Ou manualmente:

```powershell
docker compose up -d --build
```

Acesse:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Login inicial: `admin@pingalert.pro`
- Senha inicial: `admin123`

O banco SQLite é criado em um volume Docker e recebe os dados iniciais apenas na primeira execução.

Para acompanhar os logs:

```powershell
docker compose logs -f
```

Para parar:

```powershell
docker compose down
```

Para apagar também o banco e reiniciar do zero:

```powershell
docker compose down -v
```

## VPN no Windows

O monitoramento é executado no mesmo ambiente do backend. Quando o backend roda no Docker, o PING parte do container Linux. Algumas VPNs do Windows não encaminham suas rotas privadas para containers.

Primeiro teste o IP no Windows:

```powershell
ping 10.0.0.1
Test-NetConnection 10.0.0.1 -Port 80
```

Se funcionar no Windows, mas falhar no sistema executado pelo Docker, rode o backend diretamente no Windows:

```powershell
Copy-Item .env.example backend\.env
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Em outro PowerShell, rode o frontend:

```powershell
cd frontend
"NEXT_PUBLIC_API_URL=http://localhost:3001" | Set-Content .env.local
npm install
npm run dev
```

Nesse modo, o backend usa diretamente as rotas criadas pela VPN do Windows.

## Monitoramento OpenVPN

O tipo `OPENVPN` não detecta automaticamente o ícone de VPN conectada no computador. Ele lê um arquivo de status gerado por um servidor OpenVPN e procura o `common name` do cliente.

Por padrão:

- Windows local: `C:\openvpn-status.log`
- Docker: `/openvpn/openvpn-status.log`

Para usar no Docker, monte o arquivo no `docker-compose.yml`:

```yaml
volumes:
  - "C:/caminho/openvpn-status.log:/openvpn/openvpn-status.log:ro"
```

## Desenvolvimento sem Docker

```powershell
npm install
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
cd ..\frontend
npm install
cd ..
npm run dev
```

## Segurança

Antes de publicar em produção:

- troque `JWT_SECRET`;
- altere a senha inicial do administrador;
- configure CORS e URLs públicas;
- não envie arquivos `.env` ao GitHub;
- use HTTPS e um proxy reverso.
