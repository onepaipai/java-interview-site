param([switch]$SkipMySql,[switch]$SkipE2E,[switch]$Offline)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
function Run-Check([string]$File,[string[]]$Arguments){& $File @Arguments;if($LASTEXITCODE -ne 0){throw "Verification failed: $File $($Arguments -join ' ')"}}
Push-Location $root
try {
 $javaVersion=(& java -version 2>&1 | Out-String)
 if($javaVersion -notmatch 'version "17[.]'){throw 'Set JAVA_HOME and PATH to Java 17 before verification'}
 if((& node --version) -notmatch '^v24[.]'){throw 'Node 24 is required'}
 if(!$SkipMySql -and !(Get-Command docker -ErrorAction SilentlyContinue)){throw 'Docker is required for the MySQL gate. -SkipMySql is diagnostic only and cannot produce a releasable build.'}
 Push-Location backend
 try {$mavenArguments=@('-B','clean','package','-DforkCount=0');if($Offline){$mavenArguments=@('-o')+$mavenArguments};Run-Check 'mvn' $mavenArguments}finally{Pop-Location}
 Push-Location frontend
 try {
  Run-Check 'npm' @('ci');Run-Check 'npm' @('test');Run-Check 'npm' @('run','format:check');Run-Check 'npm' @('run','build');Run-Check 'npm' @('run','test:knowledge-core')
 } finally {Pop-Location}
 Run-Check 'node' @('frontend/node_modules/prettier/bin/prettier.cjs','--plugin=./frontend/node_modules/prettier-plugin-java/dist/index.mjs','--check','backend/src/**/*.java')
 foreach($script in @('check-deployment-config.mjs','verify-contract.mjs','sync-content-status.mjs','validate-content.mjs','validate-explanations.mjs','check-three-step.mjs','test-database-basics-answers.mjs','test-explanation-publication.mjs','test-deep-answers.mjs')){
  $arguments=@("scripts/$script");if($script -eq 'sync-content-status.mjs'){$arguments+='--check'};Run-Check 'node' $arguments
 }
 if(!$SkipMySql){Run-Check 'docker' @('compose','--env-file','.env.example','config','--quiet');& "$PSScriptRoot/test-mysql.ps1";if(!$?){throw 'MySQL gate failed'}}
 if(!$SkipE2E){& "$PSScriptRoot/test-e2e.ps1";if(!$?){throw 'E2E gate failed'}}
 $record=@('scripts/build-manifest.mjs','--record');$record+=if($SkipMySql){'--mysql=skipped'}else{'--mysql=passed'};$record+=if($SkipE2E){'--e2e=skipped'}else{'--e2e=passed'}
 Run-Check 'node' $record
} finally {Pop-Location}
