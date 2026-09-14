#Requires -Version 5.1
# Watches a single page file: when its frontmatter `title:` changes, waits
# for edits to settle (debounce) then renames the file to match the new
# slug. Runs hidden in the background; exits after a period of no edits.

param(
    [Parameter(Mandatory)]
    [string]$Path,
    [int]$DebounceSeconds = 3,
    [int]$IdleTimeoutMinutes = 60
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_log.ps1')

Write-ScriptLog "Started, watching: $Path"
trap {
    Write-ScriptLog -Level ERROR "Unhandled error: $_"
    Write-ScriptLog -Level ERROR ($_.ScriptStackTrace -replace "`r?`n", ' | ')
    throw
}

if (-not (Test-Path $Path)) {
    Write-ScriptLog -Level WARN "Path does not exist, exiting: $Path"
    exit 0
}
$currentPath = (Resolve-Path $Path).Path
$dir = Split-Path -Parent $currentPath

function Get-Slug([string]$title) {
    $slug = $title.ToLowerInvariant()
    $slug = $slug -replace "['’""]", ''
    $slug = $slug -replace '[^a-z0-9]+', '-'
    $slug.Trim('-')
}

$lastWrite = (Get-Item $currentPath).LastWriteTimeUtc
$pendingSince = $null
$lastActivity = Get-Date

while ($true) {
    Start-Sleep -Seconds 1

    if (-not (Test-Path $currentPath)) {
        # File was deleted or moved by something else; stop watching.
        Write-ScriptLog "File no longer exists, stopping: $currentPath"
        exit 0
    }

    $write = (Get-Item $currentPath).LastWriteTimeUtc
    if ($write -ne $lastWrite) {
        $lastWrite = $write
        $pendingSince = Get-Date
        $lastActivity = Get-Date
    }

    if ($pendingSince -and ((Get-Date) - $pendingSince).TotalSeconds -ge $DebounceSeconds) {
        $pendingSince = $null

        $head = Get-Content $currentPath -TotalCount 20 -ErrorAction SilentlyContinue | Out-String
        if ($head -match '(?m)^title:\s*"?(.*?)"?\s*$') {
            $slug = Get-Slug $Matches[1]
            $ext = [System.IO.Path]::GetExtension($currentPath)
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($currentPath)

            if ($slug -and $slug -ne $baseName -and $baseName -ne 'index') {
                $newBase = $slug
                $newPath = Join-Path $dir "$newBase$ext"
                $suffix = 2
                while ((Test-Path $newPath) -and ((Resolve-Path $newPath).Path -ne $currentPath)) {
                    $newBase = "$slug-$suffix"
                    $newPath = Join-Path $dir "$newBase$ext"
                    $suffix++
                }
                if ($newPath -ne $currentPath) {
                    Write-ScriptLog "Renaming $currentPath -> $newPath"
                    Rename-Item -Path $currentPath -NewName ([System.IO.Path]::GetFileName($newPath))
                    $currentPath = $newPath
                    $lastWrite = (Get-Item $currentPath).LastWriteTimeUtc

                    # Rename-Item looks like delete+create to VS Code's watcher rather
                    # than a clean rename, so the old tab shows as deleted and the new
                    # file doesn't open on its own -- reopen it explicitly.
                    code $currentPath

                    # Likewise no in-place way to redirect an already-open browser tab
                    # to the new URL, so open the new one if the dev server is up.
                    $client = New-Object System.Net.Sockets.TcpClient
                    try {
                        $connect = $client.BeginConnect('localhost', 4321, $null, $null)
                        if ($connect.AsyncWaitHandle.WaitOne(500) -and $client.Connected) {
                            $urlSlug = if ($newBase -eq 'index') { '' } else { $newBase }
                            Start-Process "http://localhost:4321/$urlSlug"
                        }
                    } finally {
                        $client.Close()
                    }
                }
            }
        }
    }

    if (((Get-Date) - $lastActivity).TotalMinutes -ge $IdleTimeoutMinutes) {
        Write-ScriptLog "Idle for $IdleTimeoutMinutes minutes, stopping watch on $currentPath"
        exit 0
    }
}
