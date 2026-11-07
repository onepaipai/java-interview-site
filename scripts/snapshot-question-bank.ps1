param(
 [string]$BaseUrl='http://127.0.0.1:8080',
 [Parameter(Mandatory=$true)][string]$Directory,
 [string]$Name='before'
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$csrf=Invoke-RestMethod "$BaseUrl/api/csrf" -SessionVariable session
$headers=@{}; $headers[$csrf.headerName]=$csrf.token
$password=[IO.File]::ReadAllText((Join-Path $projectRoot 'backend/data/admin-password.txt')).Trim()
Invoke-RestMethod "$BaseUrl/api/login" -Method Post -WebSession $session -Headers $headers -Body @{username='admin';password=$password} | Out-Null
$password=$null
$questions=[Collections.Generic.List[object]]::new()
foreach($trash in @('false','true')) {
 $readCount=0
 for($page=1;;$page++) {
  $result=Invoke-RestMethod "$BaseUrl/api/admin/snapshot/questions?trash=$trash&size=100&page=$page" -WebSession $session
  foreach($question in $result.items){$questions.Add($question)}
  $readCount+=$result.items.Count
  if($readCount -ge $result.total){break}
 }
}
if(($questions.id | Sort-Object -Unique).Count -ne $questions.Count){throw 'Snapshot contains duplicate IDs; retry during a quiet period'}
[IO.Directory]::CreateDirectory($Directory) | Out-Null
[IO.File]::WriteAllText((Join-Path $Directory "questions-$Name.json"), (ConvertTo-Json -InputObject @($questions | Sort-Object id) -Depth 20))
foreach($kind in @('categories','tags')) {
 $items=Invoke-RestMethod "$BaseUrl/api/$kind" -WebSession $session
 [IO.File]::WriteAllText((Join-Path $Directory "$kind-$Name.json"), (ConvertTo-Json -InputObject $items -Depth 10))
}
$active=@($questions | Where-Object { !$_.deleted }).Count
Write-Output "Snapshot $Name saved: $active active, $($questions.Count-$active) archived, $($questions.Count) total"
