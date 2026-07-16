# PingAlert Pro 📡

PingAlert Pro é um sistema moderno e sofisticado para monitoramento de equipamentos de rede, servidores e infraestrutura. Ele verifica periodicamente o status de conectividade através de protocolos como Ping (ICMP), HTTP e TCP, enviando notificações imediatas para a sua equipe via Telegram e WhatsApp quando ocorre uma falha ou recuperação.

## ✨ Principais Funcionalidades

- **Monitoramento Multiprotocolo**: Valide roteadores (Ping), servidores web (HTTP/HTTPS) ou bancos de dados e serviços (TCP).
- **Gestão de Falhas Inteligente**: Configuração granular de "Thresholds" (tentativas antes de alertar) e "Cooldowns" (tempo de espera entre alertas repetidos) para evitar spam de mensagens.
- **Sistema Multi-Tenant**: Gerencie diferentes clientes, cada um com sua própria quota de equipamentos, com controle de acesso para Administradores, Técnicos e Clientes Finais.
- **Integração de Notificações**: Disparo automático de mensagens amigáveis pelo Telegram e WhatsApp.
- **Dashboard Premium**: Interface baseada em Next.js no padrão Dark Mode com Glassmorphism, garantindo a melhor experiência visual e analítica (Uptime, tempo de resposta, histórico de eventos).
- **Webhooks**: Integração com sistemas de terceiros (como Zapier ou n8n) em eventos de queda ou recuperação.

## 🏗️ Arquitetura e Tecnologias

O sistema segue a estrutura de **Monorepo** e é dividido em duas partes principais:

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Estilização:** CSS Customizado (Design System próprio, sem dependência excessiva de bibliotecas de componentes externas para garantir visual único).
- **Comunicação:** Fetch API com encapsulamento e gestão de tokens JWT (Local Storage).

### Backend
- **Core:** Node.js com Express e TypeScript.
- **Banco de Dados:** Prisma ORM com SQLite para desenvolvimento fácil (100% compatível para migração para PostgreSQL em produção).
- **Monitoramento (Worker):** Motor embutido no Node (rodando de forma assíncrona com `node-cron` ou _setInterval_ não bloqueante).
- **Mensageria:** Bibliotecas flexíveis para requisições HTTP (WhatsApp APIs) e webhooks.

## 🚀 Como Iniciar (Desenvolvimento)

Veja o arquivo [INSTALL.md](./INSTALL.md) para detalhes avançados de deploy, ou siga o passo a passo abaixo para rodar localmente.

### Pré-requisitos
- Node.js v18+
- NPM ou Yarn

### Instalação

1. Clone o repositório ou navegue até a pasta raiz `Ping_Radar`.
2. Configure as variáveis de ambiente baseando-se no arquivo `.env.example`.
3. Instale as dependências executando na raiz do projeto:
   ```bash
   npm run setup
   ```
4. Inicie o sistema inteiro (API, Worker e Frontend) ao mesmo tempo:
   ```bash
   npm run dev
   ```

O Frontend ficará acessível em `http://localhost:3000` e a API REST em `http://localhost:3001/api`.

## 📚 Documentação Adicional

- [Guia de Instalação e Produção (INSTALL.md)](./INSTALL.md)
- [Documentação da API REST (API.md)](./API.md)

## 📄 Licença

Este projeto é de uso proprietário e exclusivo.
