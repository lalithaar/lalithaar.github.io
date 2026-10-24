#Requires -Version 5.1
# Creates a new note under src/notes named yyyymmdd-<32 random chars>, with
# today's IST date in the frontmatter and no title to think about -- the site
# derives the SEO title from the note's first few words at build time. Opens
# the file in Notepad, ensures the Astro dev server is running, and opens the
# note in the browser.

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
. (Join-Path $PSScriptRoot '_log.ps1')

Write-ScriptLog 'Started'
trap {
    Write-ScriptLog -Level ERROR "Unhandled error: $_"
    Write-ScriptLog -Level ERROR ($_.ScriptStackTrace -replace "`r?`n", ' | ')
    throw
}

# Today's date in IST regardless of the machine's timezone.
$date = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId(
    [datetime]::UtcNow, 'India Standard Time').ToString('yyyy-MM-dd')
Write-ScriptLog "Date (IST): $date"

# yyyymmdd plus a random 32-char hex string; no title, no decisions.
$slug = ($date -replace '-', '') + '-' + [guid]::NewGuid().ToString('N')
$filePath = Join-Path 'src\notes' "$slug.md"
Write-ScriptLog "Slug: $slug"

$content = @"
---
date: $date
---

"@

$fullPath = Join-Path (Get-Location).Path $filePath
[System.IO.File]::WriteAllText($fullPath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Created $filePath  (date: $date IST)"
Write-ScriptLog "Created file: $filePath"

Write-ScriptLog "Launching Notepad for $filePath"
notepad $fullPath

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
            Write-Host "Still waiting for port 4321 (${i}s elapsed)"
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
    Write-ScriptLog "Opening browser to http://localhost:4321/notes/$slug/"
    Start-Process "http://localhost:4321/notes/$slug/"
}
Write-ScriptLog 'Done'
