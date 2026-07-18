param(
  [string]$ProfileName = 'USUARIOS-CR'
)

$ErrorActionPreference = 'Stop'

function ConvertTo-SafeProfileName {
  param([string]$Name)

  $safeName = [regex]::Replace($Name.Trim(), '[^A-Za-z0-9._-]', '_')
  if ([string]::IsNullOrWhiteSpace($safeName)) {
    throw 'O nome do perfil da VPN não pode ficar vazio.'
  }
  return $safeName
}

$safeProfileName = ConvertTo-SafeProfileName -Name $ProfileName
$taskName = "PingAlert VPN Watchdog - $ProfileName"
$workRoot = Join-Path $env:LOCALAPPDATA 'PingAlert\VpnWatchdog'
$profileDirectory = Join-Path $workRoot $safeProfileName
$configPath = Join-Path $profileDirectory 'config.json'
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

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (Test-Path -LiteralPath $watchdogProfilePath) {
  $disabledProfilePath = "$watchdogProfilePath.disabled-$timestamp"
  Move-Item -LiteralPath $watchdogProfilePath -Destination $disabledProfilePath -Force
  Write-Host "Perfil automático desativado e preservado: $disabledProfilePath" -ForegroundColor Green
}

if (Test-Path -LiteralPath $profileDirectory) {
  $backupDirectory = "$profileDirectory.disabled-$timestamp"
  Move-Item -LiteralPath $profileDirectory -Destination $backupDirectory -Force
  Write-Host "Configuração e logs preservados em: $backupDirectory" -ForegroundColor Cyan
}
else {
  Write-Host 'A pasta exclusiva desta VPN não foi encontrada. Nenhuma pasta compartilhada foi alterada.' -ForegroundColor Yellow
}

Write-Host "Remoção da VPN $ProfileName concluída sem afetar outras VPNs." -ForegroundColor Green
