# build-vsix.ps1 - Manually create .vsix package (no vsce/Node 18+ required)
$ErrorActionPreference = "Stop"
$ExtDir = $PSScriptRoot
$OutputFile = Join-Path $PSScriptRoot "nlci-vscode-0.1.0.vsix"

Write-Host "=== NLCI VS Code Extension - Manual VSIX Builder ===" -ForegroundColor Cyan

# Clean up
$staging = Join-Path $env:TEMP "vsix-staging-$(Get-Random)"
if (Test-Path $OutputFile) { Remove-Item $OutputFile -Force }

# Create staging structure (NO extension/ subdirectory)
New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "dist") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "resources") -Force | Out-Null

Write-Host "[1/4] Copying extension files..." -ForegroundColor Yellow
Copy-Item (Join-Path $ExtDir "package.json") (Join-Path $staging "package.json")
Copy-Item (Join-Path $ExtDir "README.md") (Join-Path $staging "README.md")
Copy-Item (Join-Path $ExtDir "LICENSE") (Join-Path $staging "LICENSE")
Copy-Item (Join-Path $ExtDir "dist\extension.js") (Join-Path $staging "dist\extension.js")
Copy-Item (Join-Path $ExtDir "resources\icon.svg") (Join-Path $staging "resources\icon.svg")

# Read package.json for metadata
$pkg = Get-Content (Join-Path $ExtDir "package.json") -Raw | ConvertFrom-Json

Write-Host "[2/4] Creating Content_Types.xml..." -ForegroundColor Yellow
$contentTypes = '<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension=".json" ContentType="application/json"/><Default Extension=".js" ContentType="application/javascript"/><Default Extension=".md" ContentType="text/markdown"/><Default Extension=".svg" ContentType="image/svg+xml"/><Default Extension=".txt" ContentType="text/plain"/><Default Extension=".vsixmanifest" ContentType="text/xml"/></Types>'
$ctFile = Join-Path $staging "[Content_Types].xml"
[System.IO.File]::WriteAllText($ctFile, $contentTypes)

Write-Host "[3/4] Creating extension.vsixmanifest..." -ForegroundColor Yellow
$keywords = ($pkg.keywords -join ",")
$categories = ($pkg.categories -join ",")
$repoUrl = $pkg.repository.url.Replace(".git","")
$repoGit = $pkg.repository.url
$vscodEngine = $pkg.engines.vscode

$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$($pkg.name)" Version="$($pkg.version)" Publisher="$($pkg.publisher)"/>
    <DisplayName>$($pkg.displayName)</DisplayName>
    <Description xml:space="preserve">$($pkg.description)</Description>
    <Tags>$keywords</Tags>
    <Categories>$categories</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Badges></Badges>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$vscodEngine"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/>
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="$repoUrl"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Getstarted" Value="$repoUrl"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Repository" Value="$repoGit"/>
      <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true"/>
    </Properties>
    <License>LICENSE</License>
    <Icon>resources/icon.svg</Icon>
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
"@
$manifestFile = Join-Path $staging "extension.vsixmanifest"
[System.IO.File]::WriteAllText($manifestFile, $manifest)

Write-Host "[4/4] Creating .vsix ZIP..." -ForegroundColor Yellow

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($OutputFile, [System.IO.Compression.ZipArchiveMode]::Create)

Get-ChildItem $staging -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($staging.Length + 1).Replace('\', '/')
    $entry = $zip.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($_.FullName)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
    Write-Host "  + $relativePath" -ForegroundColor DarkGray
}

$zip.Dispose()

# Cleanup staging
Remove-Item $staging -Recurse -Force

# Report
$vsixInfo = Get-Item $OutputFile
Write-Host ""
Write-Host "=== SUCCESS ===" -ForegroundColor Green
Write-Host "Created: $($vsixInfo.Name)" -ForegroundColor Green
Write-Host "Size: $([math]::Round($vsixInfo.Length / 1024, 2)) KB" -ForegroundColor Green
Write-Host "Path: $($vsixInfo.FullName)" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEP: Upload this .vsix file at:" -ForegroundColor Cyan
Write-Host "  https://marketplace.visualstudio.com/manage/publishers/nlci" -ForegroundColor White
