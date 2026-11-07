$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if(!(Get-Command docker -ErrorAction SilentlyContinue)){throw 'Docker is required for the isolated MySQL 8.4 verification. No production database is used.'}
if(Get-NetTCPConnection -LocalPort 13316 -State Listen -ErrorAction SilentlyContinue){throw 'MySQL test port 13316 is already in use; existing services will not be stopped'}
$saved=@{};foreach($name in @('MYSQL_TEST_URL','MYSQL_TEST_USER','MYSQL_TEST_PASSWORD')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
Push-Location $root
try {
 docker compose -f compose.test.yml -p java-interview-tests up -d --wait
 if($LASTEXITCODE -ne 0){throw 'MySQL test container failed to become healthy'}
 $env:MYSQL_TEST_URL='jdbc:mysql://127.0.0.1:13316/interview_test?useUnicode=true&characterEncoding=UTF-8&serverTimezone=UTC'
 $env:MYSQL_TEST_USER='interview';$env:MYSQL_TEST_PASSWORD='isolated-test-password'
 Push-Location backend
 try {mvn -B '-Dtest=MySqlIntegrationTest,DatabaseMySqlContentExamplesTest' test;if($LASTEXITCODE -ne 0){throw 'MySQL integration tests failed'}}finally{Pop-Location}
} finally {
 foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
 docker compose -f compose.test.yml -p java-interview-tests down --volumes
 Pop-Location
}
