param([switch]$Rebuild)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$runtimeVersion=(& java -version 2>&1 | Out-String)
if($runtimeVersion -notmatch 'version "17[.]'){throw 'Set JAVA_HOME and PATH to Java 17 before starting the project'}
if((& node --version) -notmatch '^v24[.]'){throw 'Node 24 is required'}
foreach($port in @(8080,5173)){
 if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw "Port $port is already in use. Stop the existing service first."}
}
Push-Location "$root\frontend"
try {
 if($Rebuild -or !(Test-Path node_modules)){
  npm ci; if($LASTEXITCODE -ne 0){throw 'npm ci failed'}
 }
} finally { Pop-Location }
Push-Location "$root\backend"
try {
 $jar='target/interview-site-1.0.0.jar'
 $needsBackend=$Rebuild -or !(Test-Path $jar)
 if(!$needsBackend){
  $newest=Get-ChildItem "$root\backend\src","$root\backend\pom.xml" -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $needsBackend=($newest -ne $null) -and ($newest.LastWriteTime -gt (Get-Item $jar).LastWriteTime)
 }
 if($needsBackend){ mvn -B clean package; if($LASTEXITCODE -ne 0){throw 'backend build failed'} }
} finally { Pop-Location }
[IO.Directory]::CreateDirectory("$root\backend\data") | Out-Null
$passwordPath="$root\backend\data\admin-password.txt"
if(!(Test-Path -LiteralPath $passwordPath)){
 $bytes=New-Object byte[] 24
 $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
 try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
 [IO.File]::WriteAllText($passwordPath,[Convert]::ToBase64String($bytes))
}
$env:ADMIN_PASSWORD=[IO.File]::ReadAllText($passwordPath)
$env:SERVER_ADDRESS='127.0.0.1'
$env:COOKIE_SECURE='false'
$backend=Start-Process java -ArgumentList '-jar','target/interview-site-1.0.0.jar' -WorkingDirectory "$root\backend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$root\backend\data\server.log" -RedirectStandardError "$root\backend\data\server-error.log"
$web=Start-Process cmd.exe -ArgumentList '/c npm run dev > local.log 2>&1' -WorkingDirectory "$root\frontend" -WindowStyle Hidden -PassThru
@{backend=$backend.Id;web=$web.Id} | ConvertTo-Json | Set-Content "$root\backend\data\local-pids.json"
Remove-Item Env:ADMIN_PASSWORD
Write-Output 'Local website: http://127.0.0.1:5173'
Write-Output 'Username: admin. Local password file: backend/data/admin-password.txt'
Write-Output 'Incremental startup: pass -Rebuild to force npm ci and a clean backend build.'
