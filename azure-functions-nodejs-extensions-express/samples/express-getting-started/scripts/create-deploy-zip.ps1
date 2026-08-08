# create-deploy-zip.ps1
# Creates a deployment zip for Azure Functions, resolving local symlinks/junctions
# Usage: powershell -ExecutionPolicy Bypass -File scripts/create-deploy-zip.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

$stageDir = Join-Path $projectRoot ".deploy-stage"
$zipPath = Join-Path $projectRoot "deploy.zip"
$expressExtSource = Resolve-Path (Join-Path $projectRoot "..\..\extensions\functions-express")

Write-Host "=== Azure Functions Deploy Zip Creator ===" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host ""

# Step 1: Build
Write-Host "[1/4] Building project..." -ForegroundColor Yellow
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Build complete." -ForegroundColor Green

# Step 2: Clean up old artifacts
Write-Host "[2/4] Preparing staging directory..." -ForegroundColor Yellow
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

# Step 3: Copy files using xcopy (which resolves junctions/symlinks)
Write-Host "[3/4] Copying deployment files..." -ForegroundColor Yellow

# Copy dist
Write-Host "  Copying dist..."
xcopy "dist" "$stageDir\dist" /E /I /Q /Y > $null

# Copy host.json
Write-Host "  Copying host.json..."
Copy-Item "host.json" "$stageDir\host.json"

# Copy package.json
Write-Host "  Copying package.json..."
Copy-Item "package.json" "$stageDir\package.json"

# Copy node_modules using xcopy (resolves symlinks automatically)
Write-Host "  Copying node_modules (this may take a moment)..."
xcopy "node_modules" "$stageDir\node_modules" /E /I /Q /Y > $null

# Verify the @azure/functions-extensions-express junction was resolved
$expressExtDest = Join-Path $stageDir "node_modules\@azure\functions-extensions-express"
if (-not (Test-Path (Join-Path $expressExtDest "dist"))) {
    Write-Host "  Resolving @azure/functions-extensions-express symlink manually..." -ForegroundColor Yellow
    if (Test-Path $expressExtDest) { Remove-Item -Recurse -Force $expressExtDest }
    New-Item -ItemType Directory -Path $expressExtDest -Force | Out-Null
    
    # Copy just what's needed from the extension source
    Copy-Item (Join-Path $expressExtSource "package.json") $expressExtDest
    xcopy (Join-Path $expressExtSource "dist") (Join-Path $expressExtDest "dist") /E /I /Q /Y > $null
    if (Test-Path (Join-Path $expressExtSource "types")) {
        xcopy (Join-Path $expressExtSource "types") (Join-Path $expressExtDest "types") /E /I /Q /Y > $null
    }
    if (Test-Path (Join-Path $expressExtSource "README.md")) {
        Copy-Item (Join-Path $expressExtSource "README.md") $expressExtDest
    }
}

# Remove devDependencies from staged node_modules (archiver, etc.)
$devDeps = @("archiver", "archiver-utils", "async", "balanced-match", "bl", "brace-expansion", 
    "buffer-crc32", "compress-commons", "concat-map", "crc-32", "crc32-stream",
    "end-of-stream", "fs-constants", "glob", "graceful-fs", "inflight", "inherits",
    "is-stream", "isarray", "jackspeak", "lazystream", "lru-cache", "minimatch", 
    "minipass", "normalize-path", "once", "path-scurry", "process-nextick-args",
    "pump", "readable-stream", "readdir-glob", "safe-buffer", "string_decoder",
    "tar-stream", "util-deprecate", "wrappy", "zip-stream")

foreach ($dep in $devDeps) {
    $depPath = Join-Path $stageDir "node_modules\$dep"
    if (Test-Path $depPath) {
        Remove-Item -Recurse -Force $depPath -ErrorAction SilentlyContinue
    }
}

Write-Host "  Files staged." -ForegroundColor Green

# Step 4: Create zip using .NET (produces Linux-compatible forward-slash paths)
Write-Host "[4/4] Creating zip archive..." -ForegroundColor Yellow

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "  Zip: $zipPath"
Write-Host "  Size: $zipSize MB"
Write-Host ""
Write-Host "To deploy:" -ForegroundColor Cyan
Write-Host '  az functionapp deployment source config-zip -g <resource-group> -n <app-name> --src deploy.zip'
Write-Host ""

# Cleanup staging
Remove-Item -Recurse -Force $stageDir

# Verify zip contents
Write-Host "Zip contents (top-level):" -ForegroundColor Yellow
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$topLevel = $zip.Entries | ForEach-Object { ($_.FullName -split '/')[0] } | Sort-Object -Unique
foreach ($item in $topLevel) {
    Write-Host "  $item"
}

# Check path separator style
$sampleEntry = ($zip.Entries | Where-Object { $_.FullName -like "*@azure*" } | Select-Object -First 1).FullName
if ($sampleEntry) {
    Write-Host ""
    Write-Host "Path style check: $sampleEntry" -ForegroundColor Yellow
    if ($sampleEntry -match '\\') {
        Write-Host "  WARNING: Backslashes detected! This may cause issues on Linux." -ForegroundColor Red
    } else {
        Write-Host "  OK: Forward slashes (Linux compatible)" -ForegroundColor Green
    }
}

$zip.Dispose()
