#Requires -Version 5.1
# Opens a native searchable popup (Out-GridView) listing existing pages under
# src/pages, opens the pick in VS Code, ensures the Astro dev server is
# running, and opens the page in the browser.

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
. (Join-Path $PSScriptRoot '_log.ps1')

Write-ScriptLog 'Started'
trap {
    Write-ScriptLog -Level ERROR "Unhandled error: $_"
    Write-ScriptLog -Level ERROR ($_.ScriptStackTrace -replace "`r?`n", ' | ')
    throw
}

# Out-GridView only exists in Windows PowerShell (not pwsh Core), so the
# picker runs there and hands back the chosen file's relative path.
Write-ScriptLog 'Launching pick-page.ps1 picker'
$filePath = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'pick-page.ps1') |
    Select-Object -Last 1

if ([string]::IsNullOrWhiteSpace($filePath)) {
    Write-Host 'No page selected.' -ForegroundColor Yellow
    Write-ScriptLog -Level WARN 'No page selected, exiting.'
    exit 1
}
Write-ScriptLog "Selected: $filePath"

$slug = [System.IO.Path]::GetFileNameWithoutExtension($filePath)
if ($slug -eq 'index') {
    $slug = ''
}

Write-ScriptLog "Launching VS Code for $filePath"
code $filePath

$fullPath = (Resolve-Path $filePath).Path
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
    # astro's own readiness check can time out on a cold start (npx resolution,
    # first Vite build) well before the server is actually reachable, so its
    # exit status/stderr here is informational only -- we do our own polling below.
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
