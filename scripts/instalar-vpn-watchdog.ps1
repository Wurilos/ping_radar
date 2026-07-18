param(
  [string]$ProfileName = 'USUARIOS-CR',
  [string]$SourceConfigPath = '',
  [string[]]$TestTargets = @('10.8.0.26', '10.8.0.33', '10.8.0.55'),
  [int]$IntervalSeconds = 15,
  [int]$FailureThreshold = 3,
  [int]$ReconnectCooldownSeconds = 180,
  [int]$ReconnectWaitSeconds = 60
)

$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function ConvertTo-SafeProfileName {
  param([string]$Name)

  $safeName = [regex]::Replace($Name.Trim(), '[^A-Za-z0-9._-]', '_')
  if ([string]::IsNullOrWhiteSpace($safeName)) {
    throw 'O nome do perfil da VPN não pode ficar vazio.'
  }
  return $safeName
}

function Find-OpenVpnGui {
  $candidates = @(
    "$env:ProgramFiles\OpenVPN\bin\openvpn-gui.exe",
    "${env:ProgramFiles(x86)}\OpenVPN\bin\openvpn-gui.exe"
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw 'OpenVPN GUI não foi encontrado. Confirme se o OpenVPN Community está instalado.'
}

function Find-OpenVpnProfile {
  param([string]$Name)

  if (-not [string]::IsNullOrWhiteSpace($SourceConfigPath)) {
    if (-not (Test-Path -LiteralPath $SourceConfigPath)) {
      throw "Arquivo de perfil não encontrado: $SourceConfigPath"
    }
    return (Resolve-Path -LiteralPath $SourceConfigPath).Path
  }

  $fileNames = @("$Name.ovpn", "$Name.conf")
  $roots = @(
    (Join-Path $env:USERPROFILE 'OpenVPN\config'),
    (Join-Path $env:USERPROFILE 'OpenVPN\config-auto'),
    (Join-Path $env:ProgramFiles 'OpenVPN\config'),
    (Join-Path $env:ProgramFiles 'OpenVPN\config-auto')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  foreach ($root in $roots) {
    foreach ($fileName in $fileNames) {
      $directPath = Join-Path $root $fileName
      if (Test-Path -LiteralPath $directPath) {
        return (Resolve-Path -LiteralPath $directPath).Path
      }
    }
  }

  foreach ($root in $roots) {
    foreach ($fileName in $fileNames) {
      $found = Get-ChildItem -LiteralPath $root -Filter $fileName -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($found) {
        return $found.FullName
      }
    }
  }

  throw "Não foi possível localizar o perfil $Name. Use -SourceConfigPath com o caminho do arquivo .ovpn."
}

function Protect-WorkDirectory {
  param([string]$DirectoryPath)

  $identityName = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $acl = New-Object System.Security.AccessControl.DirectorySecurity
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $identityName,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
    [System.Security.AccessControl.PropagationFlags]::None,
    [System.Security.AccessControl.AccessControlType]::Allow
  )
  $acl.SetAccessRuleProtection($true, $false)
  [void]$acl.AddAccessRule($rule)
  Set-Acl -LiteralPath $DirectoryPath -AclObject $acl
}

function Test-PingTarget {
  param([string]$Target)

  & "$env:SystemRoot\System32\PING.EXE" -n 1 -w 2000 $Target *> $null
  return ($LASTEXITCODE -eq 0)
}

if (-not (Test-IsAdministrator)) {
  throw 'Abra o PowerShell como Administrador e execute novamente o instalador.'
}

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'vpn-watchdog.ps1'))) {
  throw 'O arquivo vpn-watchdog.ps1 precisa estar na mesma pasta deste instalador.'
}

if ($TestTargets.Count -eq 0) {
  throw 'Informe pelo menos um IP interno em -TestTargets.'
}

$safeProfileName = ConvertTo-SafeProfileName -Name $ProfileName
$openVpnGuiPath = Find-OpenVpnGui
$sourceProfilePath = Find-OpenVpnProfile -Name $ProfileName
$watchdogProfileName = "$ProfileName-WATCHDOG"

$workRoot = Join-Path $env:LOCALAPPDATA 'PingAlert\VpnWatchdog'
$workDirectory = Join-Path $workRoot $safeProfileName
$configPath = Join-Path $workDirectory 'config.json'
$installedScriptPath = Join-Path $workDirectory 'vpn-watchdog.ps1'
$authFilePath = Join-Path $workDirectory 'openvpn-auth.tmp'
$logPath = Join-Path $workDirectory 'vpn-watchdog.log'
$statusPath = Join-Path $workDirectory 'status.json'

$userConfigDirectory = Join-Path $env:USERPROFILE 'OpenVPN\config'
$watchdogProfilePath = Join-Path $userConfigDirectory "$watchdogProfileName.ovpn"
$taskName = "PingAlert VPN Watchdog - $ProfileName"

New-Item -ItemType Directory -Path $workDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $userConfigDirectory -Force | Out-Null
Protect-WorkDirectory -DirectoryPath $workDirectory

Write-Host ''
Write-Host "Perfil encontrado: $sourceProfilePath" -ForegroundColor Cyan
Write-Host "OpenVPN GUI: $openVpnGuiPath" -ForegroundColor Cyan
Write-Host "Pasta exclusiva: $workDirectory" -ForegroundColor Cyan
Write-Host ''
Write-Host 'As credenciais serão solicitadas localmente e a senha será criptografada pelo Windows.' -ForegroundColor Yellow
Write-Host 'Não feche esta janela até a instalação terminar.' -ForegroundColor Yellow
Write-Host ''

$username = (Read-Host 'Usuário da VPN').Trim()
if ([string]::IsNullOrWhiteSpace($username)) {
  throw 'O usuário da VPN não pode ficar vazio.'
}

$securePassword = Read-Host 'Senha da VPN' -AsSecureString
$encryptedPassword = ConvertFrom-SecureString $securePassword

Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'vpn-watchdog.ps1') -Destination $installedScriptPath -Force

$profileContent = Get-Content -LiteralPath $sourceProfilePath -Raw
$profileContent = [regex]::Replace(
  $profileContent,
  '(?ms)^\s*<auth-user-pass>.*?</auth-user-pass>\s*',
  ''
)
$profileContent = [regex]::Replace(
  $profileContent,
  '(?mi)^\s*auth-user-pass(?:\s+.*)?\s*$',
  ''
)
$profileContent = [regex]::Replace(
  $profileContent,
  '(?mi)^\s*auth-retry\s+.*$',
  ''
)

$authPathForOpenVpn = $authFilePath.Replace('\', '/')
$profileContent = $profileContent.TrimEnd() + "`r`n`r`nauth-user-pass `"$authPathForOpenVpn`"`r`nauth-retry nointeract`r`n"
[System.IO.File]::WriteAllText($watchdogProfilePath, $profileContent, (New-Object System.Text.UTF8Encoding($false)))

$config = [ordered]@{
  sourceProfileName = $ProfileName
  safeProfileName = $safeProfileName
  watchdogProfileName = $watchdogProfileName
  sourceProfilePath = $sourceProfilePath
  watchdogProfilePath = $watchdogProfilePath
  openVpnGuiPath = $openVpnGuiPath
  username = $username
  encryptedPassword = $encryptedPassword
  authFilePath = $authFilePath
  testTargets = @($TestTargets)
  intervalSeconds = $IntervalSeconds
  failureThreshold = $FailureThreshold
  reconnectCooldownSeconds = $ReconnectCooldownSeconds
  reconnectWaitSeconds = $ReconnectWaitSeconds
  internetHost = '1.1.1.1'
  internetPort = 443
  logPath = $logPath
  statusPath = $statusPath
}

$config | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configPath -Encoding UTF8

$taskUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$installedScriptPath`" -ConfigPath `"$configPath`""
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
  -Description "Monitora e reconecta automaticamente o perfil OpenVPN $ProfileName." `
  -Force | Out-Null

$respondingTargets = @($TestTargets | Where-Object { Test-PingTarget -Target $_ })
if ($respondingTargets.Count -eq 0) {
  Write-Warning 'Nenhum IP de teste respondeu agora. O watchdog será instalado, mas confirme se a VPN está conectada e se os IPs aceitam ping.'
}
else {
  Write-Host "IP(s) respondendo agora: $($respondingTargets -join ', ')" -ForegroundColor Green
}

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName $taskName

Write-Host ''
Write-Host 'Watchdog instalado com sucesso.' -ForegroundColor Green
Write-Host "VPN: $ProfileName"
Write-Host "Tarefa: $taskName"
Write-Host "Perfil automático: $watchdogProfileName"
Write-Host "Configuração: $configPath"
Write-Host "Log: $logPath"
Write-Host "Status: $statusPath"
Write-Host ''
Write-Host 'Cada VPN usa uma pasta, uma tarefa e credenciais próprias. Instalar outro perfil não substitui este.' -ForegroundColor Cyan
Write-Host 'O watchdog tenta reconectar apenas o perfil correspondente a esta instalação.' -ForegroundColor Cyan
