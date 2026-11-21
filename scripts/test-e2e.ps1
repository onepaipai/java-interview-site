param([string[]]$Suite=@('test:learning-reader','test:catalog','test:e2e','test:review','test:deep-reader','test:spring-core-reader','test:spring-advanced-reader','test:database-basics-reader'),[int]$BackendPort=18081,[int]$WebPort=15181)
$AllSuites=@('test:e2e','test:review','test:interactions','test:ai','test:regressions','test:details','test:knowledge','test:knowledge-layout','test:polish','test:explanations','test:explanation-reader','test:deep-reader','test:learning-reader','test:catalog','test:spring-core-reader','test:spring-advanced-reader','test:database-basics-reader','test:explanation-pack')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
foreach($case in $Suite){if($case -notin $AllSuites){throw "Unknown E2E suite: $case"}}
foreach($port in @($BackendPort,$WebPort)){if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw "Test port $port is already in use"}}
$runId=[guid]::NewGuid().ToString('N')
$runPath=Join-Path $root "backend/target/e2e-$runId"
New-Item -ItemType Directory -Path $runPath | Out-Null
$backendProcess=$null;$webProcess=$null
$environmentNames=@('ADMIN_USERNAME','ADMIN_PASSWORD','SEED_PATH','DB_URL','DB_USER','DB_PASSWORD','UPLOAD_DIR','SERVER_ADDRESS','SERVER_PORT','COOKIE_SECURE','AI_ENABLED','API_PROXY_TARGET','TEST_BASE_URL','TEST_ADMIN_PASSWORD','TEST_ENVIRONMENT_ID')
$saved=@{};foreach($name in $environmentNames){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try {
 $env:TEST_ENVIRONMENT_ID=$runId;$env:TEST_ADMIN_PASSWORD='e2e-'+[guid]::NewGuid().ToString('N');$env:ADMIN_PASSWORD=$env:TEST_ADMIN_PASSWORD
 $env:ADMIN_USERNAME='admin';$env:SEED_PATH=Join-Path $root 'content/Java.md'
 $env:DB_URL="jdbc:h2:file:$($runPath.Replace('\','/'))/database;MODE=MySQL;DATABASE_TO_LOWER=TRUE";$env:DB_USER='sa';$env:DB_PASSWORD=''
 $env:UPLOAD_DIR=Join-Path $runPath 'uploads';$env:SERVER_ADDRESS='127.0.0.1';$env:SERVER_PORT="$BackendPort";$env:COOKIE_SECURE='false';$env:AI_ENABLED='false'
 $env:API_PROXY_TARGET="http://127.0.0.1:$BackendPort";$env:TEST_BASE_URL="http://127.0.0.1:$WebPort"
 $jar=Join-Path $root 'backend/target/interview-site-1.0.0.jar'
 if(!(Test-Path -LiteralPath $jar)){throw 'Run scripts/verify.ps1 first to build the application'}
 $backendProcess=Start-Process java -ArgumentList @('-jar',$jar,'--app.test-environment-enabled=true',"--app.test-environment-id=$runId") -WorkingDirectory "$root/backend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$runPath/backend.log" -RedirectStandardError "$runPath/backend-error.log"
 $webProcess=Start-Process node -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',"$WebPort",'--strictPort') -WorkingDirectory "$root/frontend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$runPath/web.log" -RedirectStandardError "$runPath/web-error.log"
 $healthy=$false
 for($attempt=0;$attempt -lt 120;$attempt++){
  if($backendProcess.HasExited -or $webProcess.HasExited){throw "A test service exited; inspect $runPath"}
  try{
   $response=Invoke-RestMethod "$env:TEST_BASE_URL/api/test-environment"
   # Tomcat accepts requests before ApplicationRunner finishes importing the bank.
   $seeded=Test-Path -LiteralPath "$runPath/backend.log"
   if($seeded){$seeded=Select-String -LiteralPath "$runPath/backend.log" -SimpleMatch 'Explanation publication:' -Quiet}
   if($response.id -eq $runId -and $seeded){$healthy=$true;break}
  }catch{}
  Start-Sleep -Milliseconds 500
 }
 if(!$healthy){throw "Test services did not become ready; inspect $runPath"}
 Push-Location "$root/frontend"
 try {foreach($case in $Suite){npm run $case;if($LASTEXITCODE -ne 0){throw "E2E suite failed: $case"}}}finally{Pop-Location}
} finally {
 foreach($process in @($webProcess,$backendProcess)){if($process -and !$process.HasExited){Stop-Process -Id $process.Id -ErrorAction SilentlyContinue}}
 foreach($name in $environmentNames){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
 Write-Output "Isolated test artifacts: $runPath"
}
