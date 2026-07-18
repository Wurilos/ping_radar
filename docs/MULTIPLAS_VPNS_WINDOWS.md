# Monitoramento de múltiplas VPNs no Windows

O PingAlert pode executar um watchdog separado para cada perfil OpenVPN.

Cada VPN recebe:

- uma tarefa própria no Agendador de Tarefas;
- uma pasta própria em `%LOCALAPPDATA%\PingAlert\VpnWatchdog`;
- credenciais criptografadas separadamente pelo Windows;
- um log próprio;
- um arquivo `status.json` próprio;
- um perfil auxiliar `<NOME>-WATCHDOG` no OpenVPN GUI.

## 1. Atualizar a ponte de status

Execute uma vez após atualizar o projeto:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\instalar-vpn-status-painel.ps1
```

A ponte procura tanto a instalação antiga da `USUARIOS-CR` quanto as novas VPNs instaladas em pastas separadas.

## 2. Instalar uma nova VPN

Tenha em mãos:

- o nome do perfil;
- o caminho do arquivo `.ovpn`;
- um ou mais IPs internos que só respondem quando essa VPN está conectada.

Exemplo:

```powershell
.\scripts\instalar-vpn-watchdog.ps1 `
  -ProfileName "VPN-FILIAL" `
  -SourceConfigPath "C:\VPN\VPN-FILIAL.ovpn" `
  -TestTargets @("10.20.0.10", "10.20.0.20", "10.20.0.30")
```

O instalador solicitará o usuário e a senha localmente. Não envie a senha por mensagem.

## 3. Confirmar as tarefas

```powershell
Get-ScheduledTask -TaskName "PingAlert VPN Watchdog*" |
  Select-Object TaskName, State
```

## 4. Confirmar os status exportados

```powershell
Get-ChildItem .\.vpn-watchdog\statuses\
```

Cada VPN deve produzir um arquivo JSON diferente.

## 5. Atualizar os contêineres

```powershell
docker compose up -d --build --force-recreate backend frontend
```

Depois atualize o navegador com `Ctrl + F5`.

## Observações

- Instalar uma VPN não substitui as demais.
- Cada watchdog reconecta somente o perfil correspondente.
- Os IPs de teste precisam pertencer à rede acessível pela VPN correta.
- Perfis com rotas conflitantes podem não funcionar conectados ao mesmo tempo; isso depende da configuração dos servidores OpenVPN.
