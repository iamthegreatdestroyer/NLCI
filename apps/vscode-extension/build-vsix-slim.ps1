# build-vsix-slim.ps1 - Minimal, verified VSIX builder
$ErrorActionPreference = "Stop"
$ExtDir = $PSScriptRoot
$OutputFile = Join-Path $PSScriptRoot "nlci-vscode-0.1.0.vsix"

# Remove old file
if (Test-Path $OutputFile) { Remove-Item $OutputFile -Force }

Write-Host "Creating minimal VSIX package..." -ForegroundColor Cyan

# Create a very simple ZIP with the manifest
$staging = [System.IO.Path]::GetTempPath() + "vsix-slim-$(Get-Random)"
mkdir $staging | Out-Null
mkdir (Join-Path $staging "dist") | Out-Null
mkdir (Join-Path $staging "resources") | Out-Null

# Copy files
"Copying files..."
Copy-Item (Join-Path $ExtDir "package.json") (Join-Path $staging "package.json")
Copy-Item (Join-Path $ExtDir "README.md") (Join-Path $staging "README.md")
Copy-Item (Join-Path $ExtDir "LICENSE") (Join-Path $staging "LICENSE")
Copy-Item (Join-Path $ExtDir "dist\extension.js") (Join-Path $staging "dist\extension.js")
Copy-Item (Join-Path $ExtDir "resources\icon.svg") (Join-Path $staging "resources\icon.svg")

# Create exactly what marketplace expects
Write-Host "Creating manifest..."
$manifest = @'
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="nlci-vscode" Version="0.1.0" Language="en-US" Publisher="nlci"/>
    <DisplayName>NLCI - Code Clone Detection</DisplayName>
    <Description>Neural-LSH Code Intelligence - Find similar code blocks in O(1) time</Description>
    <MoreInfo>https://github.com/iamthegreatdestroyer/NLCI</MoreInfo>
    <License>LICENSE</License>
    <Icon>resources/icon.svg</Icon>
    <Tags>code,clone,similarity</Tags>
    <Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.85.0"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="README.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="LICENSE" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="resources/icon.svg" Addressable="true"/>
  </Assets>
</PackageManifest>
'@
[System.IO.File]::WriteAllText((Join-Path $staging "extension.vsixmanifest"), $manifest)

# Create Content_Types
Write-Host "Creating [Content_Types].xml..."
$contentTypes = @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="js" ContentType="application/javascript"/>
  <Default Extension="md" ContentType="text/markdown"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
  <Default Extension="vsixmanifest" ContentType="text/xml"/>
</Types>
'@
[System.IO.File]::WriteAllText((Join-Path $staging "[Content_Types].xml"), $contentTypes)

# Create ZIP
Write-Host "Creating ZIP..."
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($OutputFile, "Create")

Get-ChildItem $staging -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($staging.Length + 1).Replace('\', '/')
    $entry = $zip.CreateEntry($relativePath)
    $stream = $entry.Open()
    $file = [System.IO.File]::OpenRead($_.FullName)
    $file.CopyTo($stream)
    $file.Close()
    $stream.Close()
    Write-Host "  $relativePath"
}

$zip.Dispose()

# Cleanup
Remove-Item $staging -Recurse -Force

$info = Get-Item $OutputFile
Write-Host "`nCreated: $($info.Name) ($([math]::Round($info.Length/1024, 2)) KB)" -ForegroundColor Green
Write-Host "Ready to upload to: https://marketplace.visualstudio.com/manage/publishers/nlci" -ForegroundColor Cyan
