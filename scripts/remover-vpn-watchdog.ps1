param(
  [string]$ProfileName = 'USUARIOS-CR',
  [switch]$ManterLogs
)

$ErrorActionPreference = 'Stop'

$taskName = "PingAlert VPN Watchdog - $ProfileName"
$workDirectory = Join-Path $env:LOCALAPPDATA 'PingAlert\VpnWatchdog'
$configPath = Join-Path $workDirectory 'config.json'
$watchdogProfileName = "$ProfileName-WATCHDOG"
$watchdogProfilePath = Join-Path (Join-Path $env:USERPROFILE 'OpenVPN\config') "$watchdogProfileName.ovpn"

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Tarefa removida: $taskName" -ForegroundColor Green
}
else {
  Write-Host 'A tarefa do watchdog não estava registrada.' -ForegroundColor Yellow
}

if (Test-Path -LiteralPath $configPath) {
  try {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    if ($config.watchdogProfilePath) {
      $watchdogProfilePath = [string]$config.watchdogProfilePath
    }
  }
  catch {
    Write-Warning "Não foi possível ler a configuração existente: $($_.Exception.Message)"
  }
}

if (Test-Path -LiteralPath $watchdogProfilePath) {
  Remove-Item -LiteralPath $watchdogProfilePath -Force
  Write-Host "Perfil automático removido: $watchdogProfilePath" -ForegroundColor Green
}

if (Test-Path -LiteralPath $workDirectory) {
  if ($ManterLogs) {
    Get-ChildItem -LiteralPath $workDirectory -File |
      Where-Object { $_.Name -notin @('vpn-watchdog.log', 'status.json') } |
      Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "Logs preservados em: $workDirectory" -ForegroundColor Cyan
  }
  else {
    Remove-Item -LiteralPath $workDirectory -Recurse -Force
    Write-Host 'Arquivos locais do watchdog removidos.' -ForegroundColor Green
  }
}

Write-Host 'Remoção concluída.' -ForegroundColor Green
