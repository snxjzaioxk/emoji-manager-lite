param(
    [switch]$DryRun,
    [string]$ConfigPath = "$(Join-Path $PSScriptRoot 'emoji-sync.config.json')"
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$node = (Get-Command node).Source
if (-not $node) {
    Write-Error 'Node.js executable not found in PATH.'
    exit 1
}

$collectArgs = @('--config', $ConfigPath)
$normalizeArgs = @('--config', $ConfigPath)
$syncArgs = @('--config', $ConfigPath)
if ($DryRun) {
    $collectArgs += '--dry-run'
    $normalizeArgs += '--dry-run'
    $syncArgs += '--dry-run'
}

Push-Location $projectRoot.Path
try {
    & $node (Join-Path $PSScriptRoot 'collect-emojis.js') @collectArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $node (Join-Path $PSScriptRoot 'normalize-emojis.js') @normalizeArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $node (Join-Path $PSScriptRoot 'sync-to-app.js') @syncArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
