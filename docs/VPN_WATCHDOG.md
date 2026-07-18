# Watchdog automático da VPN no Windows

O PingAlert inclui scripts para monitorar a conectividade do perfil OpenVPN **USUARIOS-CR** e solicitar uma reconexão automática quando a VPN parar de responder.

## Como funciona

1. Testa os IPs internos `10.8.0.26`, `10.8.0.33` e `10.8.0.55` a cada 15 segundos.
2. Considera a VPN operacional quando ao menos um destino responde.
3. Após três ciclos consecutivos sem resposta, testa a conexão normal com a internet.
4. Quando a internet está ativa, desconecta e conecta novamente um perfil auxiliar chamado `USUARIOS-CR-WATCHDOG`.
5. Aguarda até 60 segundos pela recuperação de um dos destinos internos.
6. Aplica cooldown de três minutos para impedir tentativas contínuas.
7. Registra o estado e todas as ações em arquivos locais.

O watchdog roda diretamente no Windows, porque o OpenVPN GUI e as rotas da VPN pertencem ao sistema operacional, não ao container Docker.

## Segurança das credenciais

O instalador solicita o usuário e a senha no PowerShell local.

- A senha não é gravada em texto puro permanente.
- `ConvertFrom-SecureString` usa a proteção DPAPI do Windows.
- Somente a mesma conta do Windows que instalou o watchdog consegue descriptografar a senha.
- Um arquivo temporário de autenticação é criado apenas durante a reconexão e removido logo depois.
- A pasta de trabalho recebe permissões restritas à conta atual.

Não publique a pasta `%LOCALAPPDATA%\PingAlert\VpnWatchdog` e não execute o watchdog com outra conta do Windows.

## Instalação

Faça o merge da alteração, atualize o projeto e abra o PowerShell como administrador:

```powershell
cd "C:\Users\Splice\Downloads\Ping_Radar\Ping_Radar"
git pull origin main

Set-ExecutionPolicy -Scope Process Bypass
.\scripts\instalar-vpn-watchdog.ps1
```

O instalador localizará automaticamente:

- `openvpn-gui.exe`;
- o perfil `USUARIOS-CR.ovpn`;
- a pasta de configurações do usuário.

Depois solicitará o usuário e a senha da VPN. A senha digitada não aparece na tela.

Caso o perfil não seja encontrado automaticamente:

```powershell
.\scripts\instalar-vpn-watchdog.ps1 `
  -SourceConfigPath "C:\caminho\USUARIOS-CR.ovpn"
```

## Tarefa agendada

A instalação cria:

```text
PingAlert VPN Watchdog - USUARIOS-CR
```

A tarefa:

- inicia quando a conta atual entra no Windows;
- executa com privilégios elevados;
- reinicia automaticamente se o script falhar;
- funciona independentemente do Docker e do navegador.

Como o OpenVPN GUI é um aplicativo da sessão do usuário, a tarefa usa o modo interativo e funciona enquanto essa conta estiver conectada ao Windows.

## Verificar o funcionamento

Status atual:

```powershell
Get-Content "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\status.json"
```

Últimas linhas do log:

```powershell
Get-Content "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\vpn-watchdog.log" -Tail 30
```

Estado da tarefa:

```powershell
Get-ScheduledTask -TaskName "PingAlert VPN Watchdog - USUARIOS-CR"
```

Executar um ciclo manual de diagnóstico:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\vpn-watchdog.ps1" `
  -ConfigPath "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\config.json" `
  -RunOnce
```

## Teste de reconexão

Para testar com segurança:

1. Mantenha o PowerShell aberto.
2. Desconecte manualmente o perfil atual no OpenVPN GUI.
3. Acompanhe o log:

```powershell
Get-Content "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\vpn-watchdog.log" -Wait
```

Após três falhas consecutivas, o watchdog deve tentar conectar `USUARIOS-CR-WATCHDOG`.

Se o perfil auxiliar não aparecer no menu, feche e abra novamente o OpenVPN GUI uma vez. O arquivo fica em:

```text
%USERPROFILE%\OpenVPN\config\USUARIOS-CR-WATCHDOG.ovpn
```

## Alterar os IPs de teste

Os IPs precisam ser estáveis e acessíveis somente pela VPN. Para usar outros destinos durante a instalação:

```powershell
.\scripts\instalar-vpn-watchdog.ps1 `
  -TestTargets @("10.8.0.1", "10.8.0.26", "10.8.0.33")
```

É recomendado usar ao menos três destinos. A VPN é considerada conectada quando qualquer um deles responde.

## Remover

Abra o PowerShell como administrador:

```powershell
.\scripts\remover-vpn-watchdog.ps1
```

Para remover o watchdog, mas preservar os arquivos de log:

```powershell
.\scripts\remover-vpn-watchdog.ps1 -ManterLogs
```

## Observações

- O perfil original `USUARIOS-CR` não é modificado.
- O instalador cria uma cópia separada com autenticação não interativa.
- A reconexão usa os comandos suportados pelo OpenVPN GUI.
- Se a internet também estiver indisponível, o watchdog não tenta reiniciar a VPN naquele ciclo.
- Se todos os IPs de teste estiverem realmente offline, o watchdog poderá interpretar isso como queda da VPN. Escolha destinos confiáveis.
