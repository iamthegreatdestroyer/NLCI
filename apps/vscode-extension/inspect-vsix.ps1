#!/usr/bin/env pwsh
# inspect-vsix.ps1 - Extract and display VSIX contents

$vsixPath = "$PSScriptRoot\nlci-vscode-0.1.0.vsix"
$tempDir = [System.IO.Path]::GetTempPath() + "vsix-inspect-$(Get-Random)"

Write-Host "=== VSIX Inspector ===" -ForegroundColor Cyan

if (-Not (Test-Path $vsixPath)) {
    Write-Host "VSIX file not found: $vsixPath" -ForegroundColor Red
    exit 1
}

Write-Host "File: $(Split-Path $vsixPath -Leaf)" -ForegroundColor Yellow
Write-Host "Size: $([math]::Round((Get-Item $vsixPath).Length / 1024, 2)) KB" -ForegroundColor Yellow

# Extract
mkdir $tempDir -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($vsixPath, $tempDir)

# List all files
Write-Host "`n=== FILES IN VSIX ===" -ForegroundColor Green
Get-ChildItem $tempDir -Recurse -File | Sort-Object FullName | % {
    $rel = $_.FullName.Replace($tempDir + '\', '')
    Write-Host "  [+] $rel"
}

# Show manifest
Write-Host "`n=== MANIFEST CONTENT ===" -ForegroundColor Green
$manifestPath = "$tempDir\extension.vsixmanifest"
if (Test-Path $manifestPath) {
    Get-Content $manifestPath | Write-Host
} else {
    Write-Host "Manifest not found!" -ForegroundColor Red
}

# Check asset paths
Write-Host "`n=== VALIDATING ASSET PATHS ===" -ForegroundColor Green
$manifest = [xml](Get-Content $manifestPath)
$assets = $manifest.SelectNodes("//PackageManifest:Asset" , @{"PackageManifest" = "http://schemas.microsoft.com/developer/vsx-schema/2011" })

if ($assets.Count -eq 0) {
    # Try without namespace
    $assets = $manifest.SelectNodes("//Asset")
}

foreach ($asset in $assets) {
    $path = $asset.Path
    $fullPath = Join-Path $tempDir $path
    $exists = Test-Path $fullPath
    $status = if ($exists) { "OK" } else { "MISSING" }
    Write-Host "  [$status] $path"
}

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "`n=== Complete ===" -ForegroundColor Cyan
