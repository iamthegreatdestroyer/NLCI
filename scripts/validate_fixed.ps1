# NLCI Validation Script for PowerShell
# Validates the complete NLCI monorepo setup

Write-Host "🔍 NLCI Validation" -ForegroundColor Cyan
Write-Host "==================`n" -ForegroundColor Cyan

$script:FailureCount = 0

function Test-Section {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    Write-Host "📋 $Name" -ForegroundColor Yellow
    
    try {
        & $Test
        Write-Host "  ✅ PASS`n" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ FAIL: $_`n" -ForegroundColor Red
        $script:FailureCount++
    }
}

# 1. Check Node.js and PNPM
Test-Section "Node.js and PNPM" {
    $nodeVersion = node --version
    $pnpmVersion = pnpm --version
    
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }
    
    if (-not $pnpmVersion) {
        throw "PNPM not found"
    }
    
    Write-Host "  Node.js: $nodeVersion"
    Write-Host "  PNPM: $pnpmVersion"
}

# 2. Check directory structure
Test-Section "Directory Structure" {
    $requiredDirs = @(
        "packages/core",
        "packages/shared",
        "packages/config",
        "apps/cli",
        "apps/vscode-extension",
        "docs",
        "scripts",
        "examples/basic-usage",
        "examples/ci-integration",
        "examples/custom-embedder"
    )
    
    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path $dir)) {
            throw "Missing directory: $dir"
        }
    }
    
    Write-Host "  All required directories exist"
}

# 3. Check root files
Test-Section "Root Configuration Files" {
    $requiredFiles = @(
        "package.json",
        "pnpm-workspace.yaml",
        "turbo.json",
        "tsconfig.json",
        ".gitignore",
        ".prettierrc",
        ".prettierignore",
        "LICENSE",
        "README.md",
        "CONTRIBUTING.md",
        "SECURITY.md"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Missing file: $file"
        }
    }
    
    Write-Host "  All root files exist"
}

# 4. Check package.json files
Test-Section "Package Configuration" {
    $packages = @(
        ".",
        "packages/core",
        "packages/shared",
        "packages/config",
        "apps/cli",
        "apps/vscode-extension",
        "examples/basic-usage",
        "examples/custom-embedder"
    )
    
    foreach ($pkg in $packages) {
        $packageJson = Join-Path $pkg "package.json"
        if (-not (Test-Path $packageJson)) {
            throw "Missing package.json in $pkg"
        }
    }
    
    Write-Host "  All package.json files exist"
}

# 5. Check scripts
Test-Section "Automation Scripts" {
    $scripts = @(
        "scripts/setup.sh",
        "scripts/benchmark.sh",
        "scripts/release.sh",
        "scripts/validate.sh"
    )
    
    foreach ($script in $scripts) {
        if (-not (Test-Path $script)) {
            throw "Missing script: $script"
        }
    }
    
    Write-Host "  All scripts exist"
}

# 6. Check documentation
Test-Section "Documentation" {
    $docs = @(
        "docs/getting-started.md",
        "docs/api-reference.md",
        "docs/algorithms.md",
        "docs/architecture.md"
    )
    
    foreach ($doc in $docs) {
        if (-not (Test-Path $doc)) {
            throw "Missing documentation: $doc"
        }
    }
    
    Write-Host "  All documentation files exist"
}

# 7. Check examples
Test-Section "Examples" {
    $examples = @(
        "examples/basic-usage/README.md",
        "examples/basic-usage/example.ts",
        "examples/basic-usage/package.json",
        "examples/ci-integration/README.md",
        "examples/ci-integration/.github/workflows/clone-detection.yml",
        "examples/custom-embedder/README.md",
        "examples/custom-embedder/custom-model.ts"
    )
    
    foreach ($example in $examples) {
        if (-not (Test-Path $example)) {
            throw "Missing example file: $example"
        }
    }
    
    Write-Host "  All example files exist"
}

# 8. Check GitHub workflows
Test-Section "GitHub Workflows" {
    $workflows = @(
        ".github/workflows/ci.yml",
        ".github/workflows/release.yml",
        ".github/workflows/security.yml"
    )
    
    foreach ($workflow in $workflows) {
        if (-not (Test-Path $workflow)) {
            throw "Missing workflow: $workflow"
        }
    }
    
    Write-Host "  All workflows exist"
}

# 9. Count files
Test-Section "File Count" {
    $totalFiles = (Get-ChildItem -Recurse -File -Exclude "node_modules", "dist", ".git" | Measure-Object).Count
    
    if ($totalFiles -lt 70) {
        throw "Expected at least 70 files, found $totalFiles"
    }
    
    Write-Host "  Total files: $totalFiles"
}

# 10. Git status
Test-Section "Git Status" {
    $gitStatus = git status --porcelain
    
    if ($gitStatus) {
        Write-Host "  Uncommitted changes detected:"
        Write-Host $gitStatus
    }
    else {
        Write-Host "  Working directory clean"
    }
}

# Final summary
Write-Host "`n==================" -ForegroundColor Cyan
if ($script:FailureCount -eq 0) {
    Write-Host "✅ All validation checks PASSED" -ForegroundColor Green
    Write-Host "`nNLCI monorepo is ready!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Run: pnpm install" -ForegroundColor White
    Write-Host "  2. Run: pnpm build" -ForegroundColor White
    Write-Host "  3. Run: pnpm test" -ForegroundColor White
    Write-Host "  4. Commit changes: git add . && git commit -m 'feat: complete NLCI scaffolding'" -ForegroundColor White
    exit 0
}
else {
    Write-Host "❌ Validation FAILED with $script:FailureCount error(s)" -ForegroundColor Red
    exit 1
}
