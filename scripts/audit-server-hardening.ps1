param([string]$OutputPath = (Join-Path $PSScriptRoot '..\docs\security\SERVER_HARDENING_REPORT.md'))

$ErrorActionPreference = 'SilentlyContinue'
$lines = [System.Collections.Generic.List[string]]::new()
function Add-Line([string]$value = '') { $lines.Add($value) }
function Status($value) {
    if ($null -eq $value) { 'NO VERIFICADO' }
    elseif ([bool]$value) { 'CUMPLE' }
    else { 'REVISAR' }
}

$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue 2>$null
$firewall = Get-NetFirewallProfile -ErrorAction SilentlyContinue 2>$null
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue 2>$null | Sort-Object LocalPort -Unique
$defender = Get-MpComputerStatus -ErrorAction SilentlyContinue 2>$null
$bitlocker = Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction SilentlyContinue 2>$null
$smb1 = Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -ErrorAction SilentlyContinue 2>$null
$smbServer = Get-SmbServerConfiguration -ErrorAction SilentlyContinue 2>$null
$dockerPorts = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerSource = 'Windows'
    $dockerPorts = docker ps --format '{{.Names}}|{{.Ports}}' 2>$null
} elseif (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
    $dockerSource = 'WSL Ubuntu'
    $dockerPorts = wsl.exe -d Ubuntu -- sh -lc "docker ps --format '{{.Names}}|{{.Ports}}'" 2>$null
}

Add-Line '# Informe de hardening del servidor'
Add-Line
Add-Line ("Generado: {0:yyyy-MM-dd HH:mm:ss zzz}" -f (Get-Date))
Add-Line
Add-Line 'Este informe es una comprobación técnica local; no reemplaza una auditoría del proveedor, hipervisor o red perimetral.'
Add-Line
Add-Line '## Resumen'
Add-Line
Add-Line '| Control | Estado | Evidencia |'
Add-Line '|---|---|---|'
$firewallOk = $firewall -and (($firewall | Where-Object Enabled).Count -eq $firewall.Count)
Add-Line "| Firewall activo en todos los perfiles | $(Status $firewallOk) | $((($firewall | ForEach-Object { "$($_.Name)=$($_.Enabled)" }) -join ', ')) |"
$defenderOk = $defender -and $defender.AntivirusEnabled -and $defender.RealTimeProtectionEnabled
Add-Line "| Antivirus y protección en tiempo real | $(Status $defenderOk) | Antivirus=$($defender.AntivirusEnabled), TiempoReal=$($defender.RealTimeProtectionEnabled) |"
$diskOk = if ($null -eq $bitlocker) { $null } else { $bitlocker.ProtectionStatus -eq 'On' }
$diskEvidence = if ($null -eq $bitlocker) { 'Requiere ejecutar como administrador' } else { "BitLocker=$($bitlocker.ProtectionStatus)" }
Add-Line "| Cifrado del disco del sistema | $(Status $diskOk) | $diskEvidence |"
$smbOk = if ($null -ne $smbServer) { -not $smbServer.EnableSMB1Protocol } elseif ($null -ne $smb1) { $smb1.State -eq 'Disabled' } else { $null }
$smbEvidence = if ($null -ne $smbServer) { "EnableSMB1Protocol=$($smbServer.EnableSMB1Protocol)" } else { "FeatureState=$($smb1.State)" }
Add-Line "| SMBv1 desactivado | $(Status $smbOk) | $smbEvidence |"
Add-Line "| Sistema operativo soportado | $(Status ($null -ne $os)) | $($os.Caption) $($os.Version) |"
$publicAppPorts = $listeners | Where-Object { $_.LocalPort -in @(3000, 5432, 8080) -and $_.LocalAddress -in @('0.0.0.0', '::') }
Add-Line "| Puertos de aplicación no expuestos globalmente | $(Status (-not $publicAppPorts)) | $((($publicAppPorts | ForEach-Object { "$($_.LocalAddress):$($_.LocalPort)" }) -join ', ')) |"
Add-Line
Add-Line '## Puertos TCP en escucha'
Add-Line
Add-Line '| Dirección | Puerto | Proceso |'
Add-Line '|---|---:|---:|'
foreach ($listener in $listeners) {
    Add-Line "| $($listener.LocalAddress) | $($listener.LocalPort) | $($listener.OwningProcess) |"
}
Add-Line
Add-Line '## Puertos publicados por Docker'
Add-Line
if ($dockerPorts) {
    Add-Line "Motor consultado: $dockerSource"
    Add-Line
    foreach ($entry in $dockerPorts) { Add-Line "- $entry" }
} else {
    Add-Line '- Docker no está iniciado o no hay contenedores en ejecución.'
}
Add-Line
Add-Line '## Criterio esperado para Puyo Express'
Add-Line
Add-Line '- PostgreSQL 5432 y backend 8080 no deben aparecer publicados al host.'
Add-Line '- Solo debe publicarse el reverse proxy en `127.0.0.1:8088` (o el puerto configurado).'
Add-Line '- Para acceso remoto, un proxy TLS administrado debe exponer únicamente 443.'
Add-Line '- Todo puerto adicional debe tener propietario, justificación y regla de firewall documentados.'

$directory = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force -Path $directory | Out-Null
[System.IO.File]::WriteAllLines((Resolve-Path $directory).Path + '\' + (Split-Path $OutputPath -Leaf), $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Informe generado: $OutputPath"
