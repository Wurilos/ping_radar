param(
  [string]$SourceRoot = "$env:LOCALAPPDATA\PingAlert\VpnWatchdog",
  [string]$DestinationDirectory,
  [int]$IntervalSeconds = 5,
  [switch]$RunOnce
)

$ErrorActionPreference = 'Continue'

if ([string]::IsNullOrWhiteSpace($DestinationDirectory)) {
  throw 'Informe a pasta de destino com -DestinationDirectory.'
}

New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null

function ConvertTo-SafeFileName {
  param([string]$Name)

  $safeName = [regex]::Replace($Name.Trim(), '[^A-Za-z0-9._-]', '_')
  if ([string]::IsNullOrWhiteSpace($safeName)) {
    return 'VPN'
  }
  return $safeName
}

function Export-VpnStatuses {
  $selectedByProfile = @{}

  if (Test-Path -LiteralPath $SourceRoot) {
    $statusFiles = Get-ChildItem -LiteralPath $SourceRoot -Filter 'status.json' -File -Recurse -ErrorAction SilentlyContinue

    foreach ($statusFile in $statusFiles) {
      try {
        $status = Get-Content -LiteralPath $statusFile.FullName -Raw | ConvertFrom-Json
        $profileName = [string]$status.profileName
        if ([string]::IsNullOrWhiteSpace($profileName)) {
          $profileName = $statusFile.Directory.Name
        }

        $lastCheck = [datetime]::MinValue
        if ($status.lastCheck) {
          [void][datetime]::TryParse([string]$status.lastCheck, [ref]$lastCheck)
        }

        $existing = $selectedByProfile[$profileName]
        if (-not $existing -or $lastCheck -gt $existing.LastCheck) {
          $selectedByProfile[$profileName] = [pscustomobject]@{
            File = $statusFile
            LastCheck = $lastCheck
          }
        }
      }
      catch {
        Write-Warning "Status inválido ignorado em $($statusFile.FullName): $($_.Exception.Message)"
      }
    }
  }

  $activeFiles = @()
  foreach ($profileName in $selectedByProfile.Keys) {
    try {
      $safeName = ConvertTo-SafeFileName -Name $profileName
      $destinationPath = Join-Path $DestinationDirectory "$safeName.json"
      $temporaryPath = "$destinationPath.tmp"
      Copy-Item -LiteralPath $selectedByProfile[$profileName].File.FullName -Destination $temporaryPath -Force
      Move-Item -LiteralPath $temporaryPath -Destination $destinationPath -Force
      $activeFiles += "$safeName.json"
    }
    catch {
      Write-Warning "Falha ao exportar a VPN ${profileName}: $($_.Exception.Message)"
    }
  }

  Get-ChildItem -LiteralPath $DestinationDirectory -Filter '*.json' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin $activeFiles } |
    ForEach-Object {
      try {
        Move-Item -LiteralPath $_.FullName -Destination "$($_.FullName).stale" -Force
      }
      catch {
        Write-Warning "Falha ao arquivar status antigo $($_.Name): $($_.Exception.Message)"
      }
    }
}

while ($true) {
  Export-VpnStatuses

  if ($RunOnce) {
    break
  }

  Start-Sleep -Seconds ([Math]::Max(2, $IntervalSeconds))
}
