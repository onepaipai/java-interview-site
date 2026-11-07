$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$path="$root\backend\data\local-pids.json"
if(!(Test-Path -LiteralPath $path)){throw 'No recorded local service processes'}
$ids=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
foreach($idValue in @($ids.backend,$ids.web)){
 $process=Get-CimInstance Win32_Process -Filter "ProcessId=$idValue"
 $viteInWorkspace=$process -and $process.Name -eq 'node.exe' -and $process.CommandLine -and $process.CommandLine.Replace('/','\').Contains("$root\frontend\node_modules\") -and $process.CommandLine.Replace('/','\').Contains('\vite\bin\vite.js')
 if($process -and (($process.Name -eq 'java.exe' -and $process.CommandLine -like '*interview-site-1.0.0.jar*') -or ($process.Name -eq 'cmd.exe' -and $process.CommandLine -like '*npm run dev*') -or $viteInWorkspace)){
  & taskkill /PID $idValue /T /F | Out-Null
 }
}
Remove-Item -LiteralPath $path
Write-Output 'Recorded local services stopped.'
