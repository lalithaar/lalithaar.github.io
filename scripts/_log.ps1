# Shared logging helper. Dot-source this from other scripts:
#   . (Join-Path $PSScriptRoot '_log.ps1')
# Writes timestamped lines to scripts/logs/scripts.log so background/hidden
# scripts (watch-title.ps1, pick-page.ps1) and anything that dies before its
# console is visible still leave a trail. Tail it with:
#   Get-Content scripts\logs\scripts.log -Tail 50 -Wait

$script:LogFile = Join-Path $PSScriptRoot 'logs\scripts.log'
$script:LogSourceName = if ($MyInvocation.PSCommandPath) {
    Split-Path -Leaf (Get-PSCallStack)[-1].ScriptName
} else {
    'unknown'
}

function Write-ScriptLog {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR')][string]$Level = 'INFO'
    )
    $logDir = Split-Path -Parent $script:LogFile
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $source = (Get-PSCallStack)[1].ScriptName
    $source = if ($source) { Split-Path -Leaf $source } else { $script:LogSourceName }
    $line = '[{0:yyyy-MM-dd HH:mm:ss}] [{1}] [{2}] [pid {3}] {4}' -f (Get-Date), $Level, $source, $PID, $Message
    Add-Content -Path $script:LogFile -Value $line -Encoding utf8
}
