[CmdletBinding(SupportsShouldProcess)]
param([ValidateRange(1,87600)][int]$OlderThanHours=24)
$ErrorActionPreference='Stop'
$projectRoot=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$cutoff=(Get-Date).AddHours(-$OlderThanHours)
$skipDirectories=@('node_modules','.git','backups','release')
$keep=@('backend/data/server.log','backend/data/server-error.log','frontend/local.log','frontend/local-error.log')
function Find-Logs([string]$directory) {
 foreach($entry in Get-ChildItem -LiteralPath $directory -Force){
  if($entry.Attributes -band [IO.FileAttributes]::ReparsePoint){continue}
  if($entry.PSIsContainer){if($entry.Name -notin $skipDirectories){Find-Logs $entry.FullName}}
  elseif($entry.Extension -eq '.log'){$entry}
 }
}
$deleted=0;[long]$bytes=0;$skipped=0
foreach($file in Find-Logs $projectRoot){
 $resolved=[IO.Path]::GetFullPath($file.FullName)
 if(-not $resolved.StartsWith($projectRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Log outside project'}
 $relative=$resolved.Substring($projectRoot.Length+1).Replace('\','/')
 if($relative -in $keep -or $file.LastWriteTime -ge $cutoff){$skipped++;continue}
 # An open writer or reader may need the log; never truncate a running service's output.
 try{$handle=[IO.File]::Open($resolved,'Open','ReadWrite','None');$handle.Dispose()}catch{$skipped++;continue}
 if($PSCmdlet.ShouldProcess($relative,'Delete old log')){
  $length=$file.Length
  try{Remove-Item -LiteralPath $resolved -ErrorAction Stop;$deleted++;$bytes+=$length}catch{$skipped++}
 }
}
[pscustomobject]@{Deleted=$deleted;Bytes=$bytes;Skipped=$skipped}
