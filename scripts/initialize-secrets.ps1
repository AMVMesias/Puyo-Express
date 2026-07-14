param([switch]$Force)

$ErrorActionPreference = 'Stop'
$secretDirectory = Join-Path $PSScriptRoot '..\secrets'
New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null

function New-RandomBase64([int]$byteCount) {
    $bytes = New-Object byte[] $byteCount
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes)
}

function Write-Secret([string]$name, [int]$byteCount) {
    $path = Join-Path $secretDirectory $name
    if ((Test-Path $path) -and -not $Force) {
        Write-Host "Conservado: $name"
        return
    }
    [System.IO.File]::WriteAllText($path, (New-RandomBase64 $byteCount), [System.Text.UTF8Encoding]::new($false))
    Write-Host "Generado: $name"
}

Write-Secret 'postgres_password.txt' 36
Write-Secret 'jwt_secret.txt' 32
Write-Secret 'data_encryption_key.txt' 32
Write-Host 'Secretos listos en secrets/ (directorio excluido de Git).'
