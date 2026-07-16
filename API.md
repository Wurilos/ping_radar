# PingAlert Pro - Documentação da API REST

A API do PingAlert Pro segue o padrão REST e utiliza JSON para comunicação. 

**URL Base (Local):** `http://localhost:3001/api`

## Autenticação

Todos os endpoints (exceto Login e Webhooks públicos) requerem um token JWT (JSON Web Token) válido, passado no cabeçalho da requisição (Header).

```http
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## 1. Auth (Autenticação)

### `POST /auth/login`
Autentica o usuário e retorna o token de acesso.
**Body:**
```json
{
  "email": "admin@pingalert.pro",
  "password": "admin123"
}
```
**Resposta de Sucesso (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "abc...",
    "name": "Administrador",
    "email": "admin@pingalert.pro",
    "role": "ADMIN"
  }
}
```

### `GET /auth/profile`
Retorna as informações do usuário atual baseado no token JWT.

---

## 2. Equipments (Equipamentos)

### `GET /equipments`
Retorna a lista de equipamentos paginada. O usuário só verá equipamentos da qual ele possui acesso baseado no seu `clientId` (se for papel CLIENT).
**Query Params:**
- `status` (opcional): Filtra por status (`ONLINE`, `OFFLINE`, `UNSTABLE`, `MAINTENANCE`)
- `search` (opcional): Busca por nome, host, ID.

### `GET /equipments/:id`
Detalhes completos de um equipamento específico.

### `POST /equipments`
Cadastra um novo equipamento.
**Body:**
```json
{
  "name": "Roteador BGP Core",
  "host": "192.168.10.1",
  "checkType": "PING",
  "checkInterval": 60,
  "failThreshold": 3
}
```

### `POST /equipments/:id/test`
Realiza um teste imediato síncrono daquele equipamento fora da rotina do sistema para debug.
**Resposta:**
```json
{
  "success": true,
  "responseTime": 12.5,
  "error": null
}
```

### `GET /equipments/:id/history`
Retorna a lista de transições de status (eventos de mudança de estado).

---

## 3. Alerts (Alertas)

### `GET /alerts`
Lista o histórico de todos os alertas (notificações) enviados pelo sistema para o Telegram, WhatsApp ou Webhooks.

### `POST /alerts/send`
Dispara manualmente um alerta de notificação para um equipamento.
**Body:**
```json
{
  "equipmentId": "abc...",
  "message": "Mensagem customizada do técnico",
  "channels": ["TELEGRAM", "WHATSAPP"]
}
```

---

## 4. Clients (Clientes)

### `GET /clients`
Lista todos os clientes corporativos cadastrados na plataforma.

### `POST /clients`
Cria um novo cliente e define parâmetros da assinatura (quantidade máxima de equipamentos permitida, plano e dados de contato).

---

## 5. Users (Usuários)

Gestão de operadores e acessos da plataforma (Restrito para a ROLE `ADMIN`).

### `POST /users`
Cria credencial de acesso na plataforma. É possível vincular o acesso de um usuário ao ID de um Cliente corporativo.

---

## 6. System (Sistema e Webhooks)

### `GET /health`
Endpoint público sem autenticação para monitoramento de vida do próprio sistema Backend.

### `GET /settings`
Recupera as configurações e variáveis de preferências do sistema.

### `POST /integrations/telegram/test`
Testa a conectividade com a API do Telegram utilizando o token fornecido nas variáveis de ambiente, enviando um ping de validação.
