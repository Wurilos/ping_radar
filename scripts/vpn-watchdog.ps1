param(
  [string]$ConfigPath = "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\config.json",
  [switch]$RunOnce
)

$ErrorActionPreference = 'Stop'

function Write-WatchdogLog {
  param(
    [string]$Message,
    [ValidateSet('INFO', 'WARN', 'ERROR', 'SUCCESS')]
    [string]$Level = 'INFO'
  )

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$timestamp] [$Level] $Message"
  Write-Host $line
  Add-Content -LiteralPath $script:Config.logPath -Value $line -Encoding UTF8
}

function Save-WatchdogStatus {
  param(
    [string]$State,
    [string]$Message,
    [int]$ConsecutiveFailures,
    [datetime]$LastReconnect = [datetime]::MinValue
  )

  $status = [ordered]@{
    profileName = $script:Config.sourceProfileName
    watchdogProfileName = $script:Config.watchdogProfileName
    state = $State
    message = $Message
    consecutiveFailures = $ConsecutiveFailures
    lastCheck = (Get-Date).ToString('o')
    lastReconnect = if ($LastReconnect -eq [datetime]::MinValue) { $null } else { $LastReconnect.ToString('o') }
    targets = @($script:Config.testTargets)
  }

  $status | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $script:Config.statusPath -Encoding UTF8
}

function Test-PingTarget {
  param([string]$Target)

  & "$env:SystemRoot\System32\PING.EXE" -n 1 -w 2000 $Target *> $null
  return ($LASTEXITCODE -eq 0)
}

function Test-AnyVpnTarget {
  foreach ($target in @($script:Config.testTargets)) {
    if (Test-PingTarget -Target $target) {
      return $true
    }
  }

  return $false
}

function Test-InternetConnection {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $asyncResult = $client.BeginConnect(
      [string]$script:Config.internetHost,
      [int]$script:Config.internetPort,
      $null,
      $null
    )

    $connected = $asyncResult.AsyncWaitHandle.WaitOne(3000, $false)
    if (-not $connected) {
      return $false
    }

    $client.EndConnect($asyncResult)
    return $true
  }
  catch {
    return $false
  }
  finally {
    $client.Close()
  }
}

function Get-PlainPassword {
  $securePassword = ConvertTo-SecureString $script:Config.encryptedPassword
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Ensure-OpenVpnGuiRunning {
  $process = Get-Process -Name 'openvpn-gui' -ErrorAction SilentlyContinue
  if ($process) {
    return
  }

  Write-WatchdogLog -Message 'OpenVPN GUI não estava aberto; iniciando o aplicativo.' -Level WARN
  Start-Process -FilePath $script:Config.openVpnGuiPath -WindowStyle Minimized
  Start-Sleep -Seconds 3
}

function Invoke-OpenVpnGuiCommand {
  param(
    [ValidateSet('connect', 'disconnect', 'reconnect')]
    [string]$Command
  )

  $arguments = @('--command', $Command, [string]$script:Config.watchdogProfileName)
  & $script:Config.openVpnGuiPath @arguments *> $null
}

function New-TemporaryAuthFile {
  $plainPassword = Get-PlainPassword
  try {
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines(
      [string]$script:Config.authFilePath,
      @([string]$script:Config.username, $plainPassword),
      $utf8WithoutBom
    )
  }
  finally {
    $plainPassword = $null
  }
}

function Remove-TemporaryAuthFile {
  if (Test-Path -LiteralPath $script:Config.authFilePath) {
    Remove-Item -LiteralPath $script:Config.authFilePath -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-VpnReconnect {
  Write-WatchdogLog -Message "Reconectando o perfil $($script:Config.sourceProfileName)..." -Level WARN
  Save-WatchdogStatus -State 'RECONNECTING' -Message 'Tentando reconectar a VPN' -ConsecutiveFailures $script:FailureCount -LastReconnect $script:LastReconnect

  New-TemporaryAuthFile

  try {
    Ensure-OpenVpnGuiRunning

    try {
      Invoke-OpenVpnGuiCommand -Command 'disconnect'
    }
    catch {
      Write-WatchdogLog -Message "Falha ao enviar disconnect: $($_.Exception.Message)" -Level WARN
    }

    Start-Sleep -Seconds 2
    Invoke-OpenVpnGuiCommand -Command 'connect'

    $deadline = (Get-Date).AddSeconds([int]$script:Config.reconnectWaitSeconds)
    do {
      Start-Sleep -Seconds 5
      if (Test-AnyVpnTarget) {
        $script:LastReconnect = Get-Date
        $script:FailureCount = 0
        Write-WatchdogLog -Message 'VPN reconectada e destinos internos voltaram a responder.' -Level SUCCESS
        Save-WatchdogStatus -State 'ONLINE' -Message 'VPN reconectada com sucesso' -ConsecutiveFailures 0 -LastReconnect $script:LastReconnect
        return $true
      }
    } while ((Get-Date) -lt $deadline)

    $script:LastReconnect = Get-Date
    Write-WatchdogLog -Message 'A reconexão foi solicitada, mas nenhum destino interno respondeu dentro do prazo.' -Level ERROR
    Save-WatchdogStatus -State 'RECONNECT_FAILED' -Message 'Reconexão não confirmada' -ConsecutiveFailures $script:FailureCount -LastReconnect $script:LastReconnect
    return $false
  }
  finally {
    Remove-TemporaryAuthFile
  }
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "Arquivo de configuração não encontrado: $ConfigPath"
}

$script:Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$requiredProperties = @(
  'sourceProfileName',
  'watchdogProfileName',
  'openVpnGuiPath',
  'username',
  'encryptedPassword',
  'authFilePath',
  'testTargets',
  'intervalSeconds',
  'failureThreshold',
  'reconnectCooldownSeconds',
  'reconnectWaitSeconds',
  'internetHost',
  'internetPort',
  'logPath',
  'statusPath'
)

foreach ($property in $requiredProperties) {
  if ($null -eq $script:Config.$property -or [string]::IsNullOrWhiteSpace([string]$script:Config.$property)) {
    throw "Configuração obrigatória ausente: $property"
  }
}

$workDirectory = Split-Path -Parent $ConfigPath
New-Item -ItemType Directory -Path $workDirectory -Force | Out-Null

$script:FailureCount = 0
$script:LastReconnect = [datetime]::MinValue
$lastKnownState = ''

Write-WatchdogLog -Message "Watchdog iniciado para o perfil $($script:Config.sourceProfileName)."
Write-WatchdogLog -Message "Destinos de teste: $(@($script:Config.testTargets) -join ', ')"

while ($true) {
  try {
    $vpnOnline = Test-AnyVpnTarget

    if ($vpnOnline) {
      $script:FailureCount = 0
      if ($lastKnownState -ne 'ONLINE') {
        Write-WatchdogLog -Message 'VPN operacional; ao menos um destino interno está respondendo.' -Level SUCCESS
      }
      $lastKnownState = 'ONLINE'
      Save-WatchdogStatus -State 'ONLINE' -Message 'VPN operacional' -ConsecutiveFailures 0 -LastReconnect $script:LastReconnect
    }
    else {
      $script:FailureCount++
      $lastKnownState = 'VPN_UNREACHABLE'
      Write-WatchdogLog -Message "Falha de conectividade VPN $($script:FailureCount)/$($script:Config.failureThreshold)." -Level WARN
      Save-WatchdogStatus -State 'VPN_UNREACHABLE' -Message 'Destinos internos sem resposta' -ConsecutiveFailures $script:FailureCount -LastReconnect $script:LastReconnect

      if ($script:FailureCount -ge [int]$script:Config.failureThreshold) {
        if (-not (Test-InternetConnection)) {
          Write-WatchdogLog -Message 'Internet também está indisponível; a VPN não será reiniciada neste ciclo.' -Level WARN
          Save-WatchdogStatus -State 'INTERNET_OFFLINE' -Message 'Internet indisponível' -ConsecutiveFailures $script:FailureCount -LastReconnect $script:LastReconnect
        }
        else {
          $cooldownExpired = (
            $script:LastReconnect -eq [datetime]::MinValue -or
            (Get-Date) -ge $script:LastReconnect.AddSeconds([int]$script:Config.reconnectCooldownSeconds)
          )

          if ($cooldownExpired) {
            [void](Invoke-VpnReconnect)
          }
          else {
            $remaining = [math]::Ceiling(($script:LastReconnect.AddSeconds([int]$script:Config.reconnectCooldownSeconds) - (Get-Date)).TotalSeconds)
            Write-WatchdogLog -Message "Aguardando cooldown de reconexão: $remaining segundo(s)." -Level WARN
            Save-WatchdogStatus -State 'COOLDOWN' -Message "Aguardando $remaining segundo(s)" -ConsecutiveFailures $script:FailureCount -LastReconnect $script:LastReconnect
          }
        }
      }
    }
  }
  catch {
    Write-WatchdogLog -Message "Erro no ciclo do watchdog: $($_.Exception.Message)" -Level ERROR
    Save-WatchdogStatus -State 'ERROR' -Message $_.Exception.Message -ConsecutiveFailures $script:FailureCount -LastReconnect $script:LastReconnect
  }

  if ($RunOnce) {
    break
  }

  Start-Sleep -Seconds ([int]$script:Config.intervalSeconds)
}
