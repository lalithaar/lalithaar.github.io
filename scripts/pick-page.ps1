#Requires -Version 5.1
# Runs under Windows PowerShell (not Core) so Out-GridView is available:
# a native popup with a live filter box for searching posts by title.

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
. (Join-Path $PSScriptRoot '_log.ps1')

Write-ScriptLog 'Started'
trap {
    Write-ScriptLog -Level ERROR "Unhandled error: $_"
    Write-ScriptLog -Level ERROR ($_.ScriptStackTrace -replace "`r?`n", ' | ')
    throw
}

$pages = Get-ChildItem 'src\pages' -File -Include '*.md', '*.astro' -Recurse |
    Sort-Object Name
Write-ScriptLog "Found $($pages.Count) pages"

$rows = foreach ($p in $pages) {
    $title = $null
    $head = Get-Content $p.FullName -TotalCount 20 | Out-String
    if ($head -match '(?m)^title:\s*"?(.*?)"?\s*$') {
        $title = $Matches[1]
    }
    [PSCustomObject]@{
        Title = if ($title) { $title } else { $p.BaseName }
        File  = $p.Name
        Path  = Resolve-Path -Relative $p.FullName
    }
}

Write-ScriptLog 'Opening Out-GridView picker'
$selected = $rows | Out-GridView -Title 'Search and pick a post' -OutputMode Single
if ($selected) {
    Write-ScriptLog "Picked: $($selected.Path)"
    Write-Output $selected.Path
} else {
    Write-ScriptLog 'Picker closed with no selection'
}
