$ErrorActionPreference='Stop'
$root=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$corrections=Get-Content (Join-Path $root 'content/explanations/question-overrides.json') -Raw | ConvertFrom-Json
$outputDir=Join-Path $root 'backend/target/reviewed-examples'
[IO.Directory]::CreateDirectory($outputDir)|Out-Null
$cases=@(
 @{key='java-language/2';expected=@('false / 0','0.03 / 0.02','precision rejected')},
 @{key='collections/1';expected='1334 / 1000'},
 @{key='concurrency-basics/1';expected='2 / 200'},
 @{key='spring-basics/3';expected=@('A','B')},
 @{key='network/4';expected=@('[]','[]','[ABC, Z]')},
 @{key='concurrency-advanced/19';expected=@('false / false','true')},
 @{key='algorithms/1';expected=@('1','null','3','9 / 2')},
 @{key='banking/20';expected='0.03 / 0.02'},
 @{key='algorithms/16';expected='1'},
 @{key='algorithms/25';expected='3'},
 @{key='algorithms/42';expected='3'},
 @{key='algorithms/43';expected='-1'}
)
$index=0
foreach($case in $cases){
 $index++
 $content=$corrections.questions.PSObject.Properties[$case.key].Value
 $code=@($content.case | Where-Object {$_.code.language -eq 'java'})[0].code.source
 if(!$code){throw "Missing Java example: $($case.key)"}
 $extra=''
 if($case.key -eq 'algorithms/1'){
  $extra=@'
for (int cap : new int[]{1, 2, 5}) {
    var actual = new Lru(cap);
    var reference = new java.util.LinkedHashMap<String, Integer>(16, 0.75f, true) {
        protected boolean removeEldestEntry(java.util.Map.Entry<String, Integer> entry) {
            return size() > cap;
        }
    };
    var random = new java.util.Random(20261015L);
    for (int operation = 0; operation < 10000; operation++) {
        String key = "k" + random.nextInt(12);
        if (random.nextBoolean()) {
            int value = random.nextInt(1000);
            actual.put(key, value); reference.put(key, value);
        } else if (!java.util.Objects.equals(actual.get(key), reference.get(key))) {
            throw new AssertionError("LRU lookup mismatch");
        }
        if (!actual.map.keySet().equals(reference.keySet()))
            throw new AssertionError("LRU membership mismatch");
        var actualOrder = new java.util.ArrayList<String>();
        var previous = actual.head;
        var cursor = actual.head.next;
        while (cursor != actual.tail) {
            if (cursor == null || cursor.prev != previous || actualOrder.size() >= actual.map.size()
                || actual.map.get(cursor.key) != cursor)
                throw new AssertionError("LRU links or map/node identity broken");
            actualOrder.add(cursor.key); previous = cursor; cursor = cursor.next;
        }
        if (actual.tail.prev != previous) throw new AssertionError("LRU tail link broken");
        var expectedOrder = new java.util.ArrayList<>(reference.keySet());
        java.util.Collections.reverse(expectedOrder);
        if (!actualOrder.equals(expectedOrder)) throw new AssertionError("LRU order mismatch");
    }
}
try { new Lru(0); throw new AssertionError("invalid capacity accepted"); }
catch (IllegalArgumentException expected) {}
'@
 }
 if($case.key -eq 'network/4'){
  $extra=@'
byte[] wire = {0, 0, 0, 3, 65, 66, 67, 0, 0, 0, 1, 90, 0, 0, 0, 0};
for (int width = 1; width <= wire.length; width++) {
    var target = new Decoder();
    var frames = new java.util.ArrayList<String>();
    for (int offset = 0; offset < wire.length; offset += width)
        frames.addAll(target.feed(java.util.Arrays.copyOfRange(wire, offset, Math.min(wire.length, offset + width))));
    if (!frames.equals(java.util.List.of("ABC", "Z", "")))
        throw new AssertionError("split frame mismatch: " + width);
}
for (byte[] invalid : new byte[][]{{-1, -1, -1, -1}, {0, 0, 0, 9}, new byte[33]}) {
    try { new Decoder().feed(invalid); throw new AssertionError("invalid frame accepted"); }
    catch (IllegalArgumentException expected) {}
}
'@
 }
 if($case.key -eq 'concurrency-advanced/19'){
  $extra=@'
var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
var entered = new java.util.concurrent.CountDownLatch(1);
var release = new java.util.concurrent.CountDownLatch(1);
var finished = new java.util.concurrent.CountDownLatch(1);
var sideEffect = new java.util.concurrent.atomic.AtomicBoolean();
try {
    var task = java.util.concurrent.CompletableFuture.runAsync(() -> {
        entered.countDown();
        try { release.await(); sideEffect.set(true); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
        finally { finished.countDown(); }
    }, executor);
    if (!entered.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("worker did not enter");
    if (!task.cancel(true)) throw new AssertionError("future was not cancelled");
    release.countDown();
    if (!finished.await(5, java.util.concurrent.TimeUnit.SECONDS) || !sideEffect.get() || !task.isCancelled())
        throw new AssertionError("cancelled CompletableFuture did not demonstrate continued execution");
} finally {
    release.countDown(); executor.shutdownNow();
    if (!executor.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("worker leaked");
}
'@
 }
 $className="ReviewedExample$index"
 $file=Join-Path $outputDir "$className.java"
 [IO.File]::WriteAllText($file,"class $className { public static void main(String[] args) throws Exception {`n$code`n$extra`n} }")
 & javac -encoding UTF-8 --release 17 -d $outputDir $file
 if($LASTEXITCODE -ne 0){throw "Example failed to compile: $($case.key)"}
 $result=(& java -cp $outputDir $className | Out-String).Trim()
 $expected=$case.expected -join [Environment]::NewLine
 if($LASTEXITCODE -ne 0 -or $result -ne $expected){throw "Unexpected result for $($case.key): $result"}
 Write-Output "$($case.key): $result PASS"
}
$lambda=$corrections.questions.PSObject.Properties['java-language/18'].Value.case | Where-Object {$_.code.source -match 'n\+\+'}
$file=Join-Path $outputDir 'InvalidCapture.java'
[IO.File]::WriteAllText($file,"class InvalidCapture { void run() {`n$($lambda.code.source)`n} }")
$messages=& javac -encoding UTF-8 --release 17 -d $outputDir $file 2>&1
if($LASTEXITCODE -eq 0){throw 'Invalid captured-variable example unexpectedly compiled'}
Write-Output 'java-language/18: changing captured variable correctly rejected by javac PASS'
Write-Output 'Deep checks: LRU 30000 reference operations with link invariants; TCP 16 fragmentation patterns and invalid lengths; cancelled CompletableFuture continues its running work PASS'
