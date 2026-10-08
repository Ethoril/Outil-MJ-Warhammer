<#
.SYNOPSIS
Runs the production-rules receipt against disposable localhost Auth/RTDB emulators.
.DESCRIPTION
Requires Firebase CLI and a Java21 portable JDK in tmp/firebase-validation.
No Firebase login or real project is used. CLI emulators:exec stops its children.
#>
[CmdletBinding()]
param(
  [int]$DatabasePort = 19000,
  [int]$AuthPort = 19099,
  [int]$HubPort = 14400,
  [int]$LoggingPort = 14500
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$setupDir = Join-Path $repoRoot 'tmp\firebase-validation'
$runDir = Join-Path $setupDir 'run'
$firebaseCli = Join-Path $setupDir 'cli\node_modules\firebase-tools\lib\bin\firebase.js'
$javaDir = Get-ChildItem -LiteralPath (Join-Path $setupDir 'java') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
if (-not $javaDir -or -not (Test-Path -LiteralPath $firebaseCli)) {
  throw 'Install portable Java21 and firebase-tools into tmp/firebase-validation/java and cli first; see RECETTE_FICHES_PJ.md.'
}
$ports = @($DatabasePort, $AuthPort, $HubPort, $LoggingPort)
if (($ports | Select-Object -Unique).Count -ne 4 -or ($ports | Where-Object { $_ -lt 1024 -or $_ -gt 65535 })) { throw 'Choose four distinct nonprivileged ports.' }
foreach ($port in $ports) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "Port $port already occupied; no process will be stopped." }
}
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$rulesPath = Join-Path $repoRoot 'firebase.database.rules.json'
$config = @{
  database = @{ rules = $rulesPath }
  emulators = @{
    auth = @{ host = '127.0.0.1'; port = $AuthPort }
    database = @{ host = '127.0.0.1'; port = $DatabasePort }
    hub = @{ host = '127.0.0.1'; port = $HubPort }
    logging = @{ host = '127.0.0.1'; port = $LoggingPort }
    ui = @{ enabled = $false }
    singleProjectMode = $false
  }
}
$configPath = Join-Path $runDir 'firebase.local.json'
$config | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $configPath -Encoding UTF8
$environmentNames = @('JAVA_HOME', 'PATH', 'FIREBASE_EMULATORS_PATH', 'FIREBASE_DATABASE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'CI', 'NO_UPDATE_NOTIFIER', 'XDG_CONFIG_HOME', 'FIREBASE_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS')
$savedEnvironment = @{}
foreach ($name in $environmentNames) { $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $env:JAVA_HOME = $javaDir.FullName
  $env:PATH = (Join-Path $javaDir.FullName 'bin') + [IO.Path]::PathSeparator + $env:PATH
  $env:FIREBASE_EMULATORS_PATH = Join-Path $setupDir 'emulators'
  $env:FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:$DatabasePort"
  $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:$AuthPort"
  $env:CI = '1'
  $env:NO_UPDATE_NOTIFIER = '1'
  $env:XDG_CONFIG_HOME = Join-Path $setupDir 'isolated-config'
  Remove-Item Env:FIREBASE_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
  $testPath = (Join-Path $repoRoot 'tests\firebase-rules-v3-emulator.mjs').Replace('\', '/')
  $testCommand = 'node "' + $testPath + '"'
  $cliPackage = Get-Content -LiteralPath (Join-Path $setupDir 'cli\node_modules\firebase-tools\package.json') -Raw | ConvertFrom-Json
  $asset = Get-Content -LiteralPath (Join-Path $setupDir 'temurin-asset.json') -Raw | ConvertFrom-Json
  $proof = @{
    project = 'demo-fiches-pj-control'
    services = @('auth', 'database')
    cliVersion = $cliPackage.version
    nodeVersion = (& node --version)
    javaPackage = $asset.binary.package.name
    javaArchiveExpectedSha256 = $asset.binary.package.checksum
    javaDownload = $asset.binary.package.link
    rulesSha256 = (Get-FileHash -LiteralPath $rulesPath -Algorithm SHA256).Hash.ToLowerInvariant()
    hosts = @{ auth = $env:FIREBASE_AUTH_EMULATOR_HOST; database = $env:FIREBASE_DATABASE_EMULATOR_HOST; hub = "127.0.0.1:$HubPort"; logging = "127.0.0.1:$LoggingPort" }
  }
  $proof | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $runDir 'environment-proof.json') -Encoding UTF8
  Write-Output ('Rules SHA256: ' + (Get-FileHash -LiteralPath $rulesPath -Algorithm SHA256).Hash.ToLowerInvariant())
  & (Join-Path $javaDir.FullName 'bin\java.exe') -version
  & node $firebaseCli --version
  Push-Location $runDir
  try {
    $ErrorActionPreference = 'Continue'
    & node $firebaseCli emulators:exec --only auth,database --project demo-fiches-pj-control --config $configPath --non-interactive $testCommand 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath (Join-Path $runDir 'receipt.log')
    $emulatorExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
  } finally { Pop-Location }
  if ($emulatorExit -ne 0) { throw "Firebase receipt failed with exit $emulatorExit; inspect tmp/firebase-validation/run/receipt.log." }
} finally {
  # Firebase's debug file includes the process environment even without --debug.
  # Keep the receipt transcript; discard only that private disposable debug file.
  $debugPath = Join-Path $runDir 'firebase-debug.log'
  if (Test-Path -LiteralPath $debugPath) { Remove-Item -LiteralPath $debugPath -ErrorAction SilentlyContinue }
  foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process') }
}
