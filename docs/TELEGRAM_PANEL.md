# Painel interativo do Telegram

O PingAlert Pro pode usar o bot do Telegram como um painel de consulta para técnicos e clientes autorizados.

## Recursos

- Resumo de equipamentos online, offline, instáveis e em manutenção.
- Listas paginadas com cliente, host e tempo offline.
- Tela de detalhes de cada equipamento.
- Resumo por cliente.
- Botões inline que atualizam a mesma mensagem.
- Controle de acesso por Telegram User ID.
- Perfil administrativo para executar `Testar agora`.
- Long polling: não exige domínio público, HTTPS ou abertura de portas.

## Configuração

Acesse **Integrações → Telegram** e preencha:

1. **Bot Token**: token completo gerado pelo BotFather.
2. **Chat ID dos alertas**: conversa, grupo ou canal que receberá alertas automáticos.
3. **Painel interativo**: mantenha ativado.
4. **IDs autorizados a consultar**: IDs separados por vírgula.
5. **IDs administradores do bot**: IDs que poderão executar testes manuais.

Depois clique em **Salvar Configurações**. O worker do bot é reiniciado automaticamente.

## Como obter o ID de um usuário

Cada usuário deve:

1. Abrir o bot no Telegram.
2. Enviar `/id`.
3. Copiar o número exibido como `Telegram User ID`.
4. Enviar esse número ao administrador do PingAlert.

O comando `/id` funciona mesmo antes de o usuário ser autorizado.

## Comandos

- `/start` ou `/menu`: abre o painel.
- `/status`: exibe o resumo geral.
- `/offline`: lista equipamentos offline.
- `/instaveis`: lista equipamentos instáveis.
- `/online`: lista equipamentos online.
- `/manutencao`: lista equipamentos em manutenção.
- `/clientes`: mostra o resumo por cliente.
- `/id`: mostra o ID do usuário e o ID do chat atual.
- `/ajuda`: mostra a ajuda.

## Permissões

- **Usuário autorizado**: consulta informações e navega pelo painel.
- **Administrador do bot**: possui as mesmas consultas e pode executar `Testar agora`.

O caractere `*` em IDs autorizados libera o painel para qualquer usuário que encontre o bot. Isso não é recomendado quando o sistema contém IPs, nomes de clientes ou informações internas.

Quando o Chat ID padrão é um grupo, os participantes desse grupo também podem usar os botões e comandos dentro do próprio grupo. Para consultas privadas, cadastre o Telegram User ID de cada pessoa.

## Verificação

A saúde do backend informa o estado do painel:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

Resultado esperado:

```text
telegramPanel : @{running=True; offset=...}
```

Logs úteis:

```powershell
docker compose logs backend --since=20m | Select-String -Pattern "Telegram|panel|polling"
```

## Teste rápido

1. Salve as configurações.
2. Clique em **Enviar mensagem de teste**.
3. Abra o bot e envie `/id`.
4. Adicione o ID em **IDs autorizados a consultar** e salve novamente.
5. Envie `/menu` ao bot.

O teste de integração agora valida o token e envia uma mensagem real ao Chat ID configurado.
