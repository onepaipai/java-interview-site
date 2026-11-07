$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$jarPath = Join-Path $projectRoot 'backend/target/interview-site-1.0.0.jar'
if (!(Test-Path -LiteralPath $jarPath)) {
    throw 'Build the backend first: mvn -f backend/pom.xml package'
}
$runtimeDir = Join-Path $projectRoot 'backend/target/explanation-sample-runtime'
$classesDir = Join-Path $projectRoot 'backend/target/explanation-sample-classes'
[IO.Directory]::CreateDirectory($runtimeDir) | Out-Null
[IO.Directory]::CreateDirectory($classesDir) | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($jarPath)
try {
    foreach ($entry in $archive.Entries | Where-Object { $_.FullName -match '^BOOT-INF/lib/.*\.jar$' }) {
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $runtimeDir $entry.Name), $true)
    }
} finally { $archive.Dispose() }

$source = Join-Path $projectRoot 'content/explanations/examples/ExplanationCases.java'
& javac -encoding UTF-8 --release 17 --class-path "$runtimeDir/*" -d $classesDir $source
if ($LASTEXITCODE -ne 0) { throw 'Explanation case compilation failed' }
& java --class-path "$classesDir;$runtimeDir/*" ExplanationCases
if ($LASTEXITCODE -ne 0) { throw 'Explanation case verification failed' }
