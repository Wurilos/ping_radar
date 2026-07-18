param(
  [string]$SourcePath = "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\status.json",
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
$destinationPath = Join-Path $sharedDirectory 'status.json'
$workDirectory = Join-Path $env:LOCALAPPDATA 'PingAlert\VpnWatchdog'
$installedScript = Join-Path $workDirectory 'vpn-status-exporter.ps1'
$taskName = 'PingAlert VPN Status Bridge'

New-Item -ItemType Directory -Path $sharedDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $workDirectory -Force | Out-Null
Copy-Item -LiteralPath $sourceScript -Destination $installedScript -Force

$taskUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$installedScript`" -SourcePath `"$SourcePath`" -DestinationPath `"$destinationPath`" -IntervalSeconds $IntervalSeconds"
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
  -Description 'Compartilha o status do watchdog da VPN com o painel PingAlert.' `
  -Force | Out-Null

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 2

Write-Host ''
Write-Host 'Ponte de status da VPN instalada com sucesso.' -ForegroundColor Green
Write-Host "Origem: $SourcePath"
Write-Host "Destino: $destinationPath"
Write-Host "Tarefa: $taskName"
Write-Host ''
Write-Host 'Apenas o arquivo de status é compartilhado. Credenciais e perfil da VPN continuam protegidos.' -ForegroundColor Cyan
