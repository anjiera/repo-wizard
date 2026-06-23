<#
.SYNOPSIS
  PowerShell setup wrapper for Windows.
#>

# Check if Node.js is installed
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Error "Error: Node.js is required but was not found."
    Write-Host "Please install Node.js (version 18 or higher) and try again."
    exit 1
}

node scripts/setup.js $args
exit $LASTEXITCODE
