#Requires -Version 5.1
# Creates a new blog post under src/pages with matching frontmatter,
# ensures the Astro dev server is running, and opens the file in VS Code.

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
. (Join-Path $PSScriptRoot '_log.ps1')

Write-ScriptLog 'Started'
trap {
    Write-ScriptLog -Level ERROR "Unhandled error: $_"
    Write-ScriptLog -Level ERROR ($_.ScriptStackTrace -replace "`r?`n", ' | ')
    throw
}

$title = Read-Host 'Post title'
if ([string]::IsNullOrWhiteSpace($title)) {
    Write-Host 'No title given, aborting.' -ForegroundColor Yellow
    Write-ScriptLog -Level WARN 'No title given, aborting.'
    exit 1
}
Write-ScriptLog "Title entered: $title"

# Slugify: lowercase, strip apostrophes/quotes, replace runs of
# non-alphanumeric characters with '-', trim leading/trailing '-'.
$slug = $title.ToLowerInvariant()
$slug = $slug -replace "['’""]", ''
$slug = $slug -replace '[^a-z0-9]+', '-'
$slug = $slug.Trim('-')

if ([string]::IsNullOrWhiteSpace($slug)) {
    Write-Host 'Title produced an empty slug, aborting.' -ForegroundColor Yellow
    exit 1
}

$baseSlug = $slug
$filePath = Join-Path 'src\pages' "$slug.md"

$suffix = 2
while (Test-Path $filePath) {
    $slug = "$baseSlug-$suffix"
    $filePath = Join-Path 'src\pages' "$slug.md"
    $suffix++
}

if ($slug -ne $baseSlug) {
    Write-Host "'$baseSlug.md' already exists, using '$slug.md' instead." -ForegroundColor Cyan
}

$escapedTitle = $title -replace '"', '\"'
$content = @"
---
title: "$escapedTitle"
layout: ../layouts/Layout.astro
---

# $title
"@

$fullPath = Join-Path (Get-Location).Path $filePath
[System.IO.File]::WriteAllText($fullPath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Created $filePath"
Write-ScriptLog "Created file: $filePath"

Write-ScriptLog "Launching VS Code for $filePath"
code $filePath

Write-ScriptLog 'Spawning watch-title.ps1'
Start-Process pwsh -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $PSScriptRoot 'watch-title.ps1'),
    '-Path', $fullPath
)

# Check whether the Astro dev server is already running; start it if not.
Write-ScriptLog 'Checking dev server status via astro dev status'
$statusRaw = npx astro dev status 2>$null | Out-String
$isRunning = $false
try {
    $status = $statusRaw | ConvertFrom-Json
    if ($status.message -notmatch 'No dev server is running') {
        $isRunning = $true
    }
} catch {
    $isRunning = $false
}

if (-not $isRunning) {
    # astro dev status only tracks servers it started itself with --background;
    # fall back to a raw port check in case one is running in another (foreground) terminal.
    $portOpen = Test-NetConnection -ComputerName localhost -Port 4321 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($portOpen) {
        $isRunning = $true
    }
}
Write-ScriptLog "Dev server already running: $isRunning"

if ($isRunning) {
    Write-Host 'Dev server already running.'
} else {
    Write-Host 'Starting Astro dev server in background...'
    Write-ScriptLog 'Running: npx astro dev --background'
    $bgOutput = npx astro dev --background 2>&1 | Out-String
    Write-ScriptLog "astro dev --background output: $($bgOutput.Trim())"

    Write-Host 'Waiting for it to come up...'
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        if (Test-NetConnection -ComputerName localhost -Port 4321 -InformationLevel Quiet -WarningAction SilentlyContinue) {
            $ready = $true
            break
        }
        if ($i % 5 -eq 0) {
            Write-ScriptLog "Still waiting for port 4321 (${i}s elapsed)"
        }
        Start-Sleep -Seconds 1
    }
    Write-ScriptLog "Dev server ready: $ready (waited ${i}s)"
    if (-not $ready) {
        Write-Host 'Server did not come up in time, skipping browser open.' -ForegroundColor Yellow
        Write-ScriptLog -Level WARN 'Server did not come up in time; run "npx astro dev status" and "npx astro dev logs" to see why.'
    }
}

if ($isRunning -or $ready) {
    Write-ScriptLog "Opening browser to http://localhost:4321/$slug"
    Start-Process "http://localhost:4321/$slug"
}
Write-ScriptLog 'Done'
