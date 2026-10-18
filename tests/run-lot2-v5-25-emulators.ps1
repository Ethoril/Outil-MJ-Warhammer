<# Local-only receipt with installed Java21/Firebase CLI, disposable demo namespace. #>
[CmdletBinding()]
param([string]$TestScript='tests/lot2-v5-25-cloud-browser.mjs',[int]$DatabasePort=19000,[int]$AuthPort=19099,[int]$HubPort=14400,[int]$LoggingPort=14500)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$runDir=Join-Path $repoRoot 'tmp/lot2-25/emulators'
$nodePath=(Get-Command node -ErrorAction Stop).Source
$javaPath=(Get-Command java -ErrorAction Stop).Source
$firebaseCommand=(Get-Command firebase -ErrorAction Stop).Source
$cliPath=Join-Path (Split-Path -Parent $firebaseCommand) 'node_modules/firebase-tools/lib/bin/firebase.js'
if (-not (Test-Path -LiteralPath $cliPath)) { throw 'Firebase CLI installation unavailable.' }
$testPath=[IO.Path]::GetFullPath((Join-Path $repoRoot $TestScript))
if (-not $testPath.StartsWith((Join-Path $repoRoot 'tests')+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $testPath)) { throw 'Receipt must be a saved test inside this workspace.' }
$ports=@($DatabasePort,$AuthPort,$HubPort,$LoggingPort)
if (($ports|Select-Object -Unique).Count -ne 4 -or ($ports|Where-Object {$_ -lt 1024 -or $_ -gt 65535})) { throw 'Use four distinct nonprivileged ports.' }
foreach($port in $ports){if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){throw "Port $port occupied; no process stopped."}}
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$config=@{database=@{rules=(Join-Path $repoRoot 'firebase.database.rules.json')};emulators=@{auth=@{host='127.0.0.1';port=$AuthPort};database=@{host='127.0.0.1';port=$DatabasePort};hub=@{host='127.0.0.1';port=$HubPort};logging=@{host='127.0.0.1';port=$LoggingPort};ui=@{enabled=$false};singleProjectMode=$false}}
$configPath=Join-Path $runDir 'firebase.local.json'
$config|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $configPath -Encoding UTF8
$names=@('PATH','JAVA_HOME','FIREBASE_DATABASE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','CI','NO_UPDATE_NOTIFIER','XDG_CONFIG_HOME','FIREBASE_TOKEN','GOOGLE_APPLICATION_CREDENTIALS')
$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try{
 $env:JAVA_HOME=Split-Path -Parent (Split-Path -Parent $javaPath)
 $env:PATH=(Split-Path -Parent $nodePath)+[IO.Path]::PathSeparator+(Split-Path -Parent $javaPath)+[IO.Path]::PathSeparator+$env:PATH
 $env:FIREBASE_DATABASE_EMULATOR_HOST="127.0.0.1:$DatabasePort";$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:$AuthPort"
 $env:CI='1';$env:NO_UPDATE_NOTIFIER='1';$env:XDG_CONFIG_HOME=Join-Path $runDir 'isolated-config'
 Remove-Item Env:FIREBASE_TOKEN -ErrorAction SilentlyContinue;Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
 $proof=@{project='demo-lot2-v5-25';nodeVersion=(& $nodePath --version);cliVersion=(& $nodePath $cliPath --version);javaPath=$javaPath;rulesSha256=(Get-FileHash -LiteralPath (Join-Path $repoRoot 'firebase.database.rules.json') -Algorithm SHA256).Hash.ToLowerInvariant();hosts=@{database=$env:FIREBASE_DATABASE_EMULATOR_HOST;auth=$env:FIREBASE_AUTH_EMULATOR_HOST};test=$TestScript}
 $proof|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $runDir 'environment-proof.json') -Encoding UTF8
 $testRelative=$TestScript.Replace('\','/')
 if($testRelative -match '\s'){throw 'Use a test filename without spaces for this local CLI runner.'}
 $testCommand='node ../../../'+$testRelative
 Push-Location $runDir
 try{$ErrorActionPreference='Continue';& $nodePath $cliPath emulators:exec --only auth,database --project demo-lot2-v5-25 --config $configPath --non-interactive $testCommand 2>&1|ForEach-Object{$_.ToString()}|Tee-Object -FilePath (Join-Path $runDir 'receipt.log');$receiptExit=$LASTEXITCODE;$ErrorActionPreference='Stop'}finally{Pop-Location}
 if($receiptExit -ne 0){throw "Local receipt failed with exit $receiptExit; inspect tmp/lot2-25/emulators/receipt.log."}
}finally{
 # The CLI debug file can contain environment data; only this known disposable file is removed.
 $debugPath=Join-Path $runDir 'firebase-debug.log';if(Test-Path -LiteralPath $debugPath){Remove-Item -LiteralPath $debugPath -ErrorAction SilentlyContinue}
 foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
}
