param(
  [string]$SourceRoot = "$env:LOCALAPPDATA\PingAlert\VpnWatchdog",
  [int]$IntervalSeconds = 5
)

$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  throw 'Abra o PowerShell como Administrador e execute novamente.'
}

$sourceScript = Join-Path $PSScriptRoot 'vpn-status-exporter.ps1'
if (-not (Test-Path -LiteralPath $sourceScript)) {
  throw "Script exportador não encontrado: $sourceScript"
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$sharedDirectory = Join-Path $projectRoot '.vpn-watchdog'
$destinationDirectory = Join-Path $sharedDirectory 'statuses'
$workRoot = Join-Path $env:LOCALAPPDATA 'PingAlert\VpnWatchdog'
$installedScript = Join-Path $workRoot 'vpn-status-exporter.ps1'
$taskName = 'PingAlert VPN Status Bridge'

New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
Copy-Item -LiteralPath $sourceScript -Destination $installedScript -Force

$taskUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$installedScript`" -SourceRoot `"$SourceRoot`" -DestinationDirectory `"$destinationDirectory`" -IntervalSeconds $IntervalSeconds"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $taskUser
$principal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description 'Compartilha os status dos watchdogs das VPNs com o painel PingAlert.' `
  -Force | Out-Null

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 2

Write-Host ''
Write-Host 'Ponte de status das VPNs instalada com sucesso.' -ForegroundColor Green
Write-Host "Origem: $SourceRoot"
Write-Host "Destino: $destinationDirectory"
Write-Host "Tarefa: $taskName"
Write-Host ''
Write-Host 'A ponte procura todas as VPNs instaladas, inclusive a instalação antiga da USUARIOS-CR.' -ForegroundColor Cyan
Write-Host 'Apenas arquivos de status são compartilhados. Credenciais e perfis continuam protegidos.' -ForegroundColor Cyan
