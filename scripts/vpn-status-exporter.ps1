param(
  [string]$SourcePath = "$env:LOCALAPPDATA\PingAlert\VpnWatchdog\status.json",
  [string]$DestinationPath,
  [int]$IntervalSeconds = 5,
  [switch]$RunOnce
)

$ErrorActionPreference = 'Continue'

if ([string]::IsNullOrWhiteSpace($DestinationPath)) {
  throw 'Informe o caminho de destino com -DestinationPath.'
}

$destinationDirectory = Split-Path -Parent $DestinationPath
New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

while ($true) {
  try {
    if (Test-Path -LiteralPath $SourcePath) {
      $temporaryPath = "$DestinationPath.tmp"
      Copy-Item -LiteralPath $SourcePath -Destination $temporaryPath -Force
      Move-Item -LiteralPath $temporaryPath -Destination $DestinationPath -Force
    }
  }
  catch {
    Write-Warning "Falha ao exportar status da VPN: $($_.Exception.Message)"
  }

  if ($RunOnce) {
    break
  }

  Start-Sleep -Seconds ([Math]::Max(2, $IntervalSeconds))
}
