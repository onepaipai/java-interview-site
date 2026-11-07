import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + n + '.html';
const jls17 = 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html';
const juc = api('java/util/concurrent/package-summary');
const aqs = api('java/util/concurrent/locks/AbstractQueuedSynchronizer.html');
const jvms2 = 'https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html';
const gctun = 'https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html';
const redisLock = 'https://redis.io/docs/latest/develop/use/patterns/distributed-locks/';
const jcstress = 'https://github.com/openjdk/jcstress';
const reviewer = 'zcode-review-20261024';
const version = 'Java 17';

const evidence = {
  2: [aqs, juc], 3: [aqs, api('java/util/concurrent/locks/ReentrantLock.html')],
  4: [juc, 'https://docs.oracle.com/en/java/javase/17/troubleshoot/process-computer-issues.html'],
  5: [api('java/util/concurrent/ConcurrentHashMap.html'), juc],
  6: [api('java/util/concurrent/locks/StampedLock.html'), juc],
  7: [api('java/util/concurrent/locks/StampedLock.html'), juc],
  8: [api('java/util/concurrent/atomic/LongAdder.html'), api('java/util/concurrent/atomic/AtomicLong.html')],
  10: [juc, api('java/lang/Thread.html')], 11: [api('java/util/concurrent/atomic/AtomicReference.html'), juc],
  12: [jls17, juc], 13: [api('java/lang/invoke/VarHandle.html'), jls17],
  14: [jvms2, 'https://docs.oracle.com/en/java/javase/17/troubleshoot/hotspot-virtual-machine-error-messages.html'],
  16: [api('java/util/concurrent/ThreadPoolExecutor.html'), juc],
  18: [juc, api('java/util/concurrent/Semaphore.html')],
  23: [api('java/util/concurrent/ThreadPoolExecutor.html'), juc],
  25: [api('java/util/concurrent/ForkJoinTask.html'), juc],
  28: ['https://openjdk.org/jeps/425', 'https://openjdk.org/jeps/446'],
  29: ['https://openjdk.org/jeps/428', 'https://openjdk.org/jeps/453'],
  30: [juc, api('java/nio/file/Files.html')],
  34: [juc, redisLock], 35: [juc, 'https://github.com/google/guava/wiki/StripedExplained'],
  36: [gctun, juc], 37: [jls17, juc], 38: [jls17, gctun],
  39: [juc, 'https://lmax-exchange.github.io/disruptor/'],
  40: [juc, gctun], 41: [api('java/util/concurrent/ConcurrentHashMap.html'), api('java/util/concurrent/CompletableFuture.html')],
  42: [juc, api('java/lang/Runtime.html')], 43: [jvms2, juc],
  44: [juc, 'https://docs.spring.io/spring-framework/reference/6.2/integration/rest-clients.html'],
  45: [redisLock], 46: [redisLock], 47: [juc, gctun], 48: [juc, redisLock],
  49: [jls17, jcstress], 50: [jls17, juc],
};

const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const byFile = new Map(manifest.entries.map(e => [e.file.slice(e.file.lastIndexOf('/') + 1), e]));
const targets = new Map();
for (let n = 1; n <= 50; n++) {
  const entry = byFile.get('concurrency-advanced-' + n + '.md');
  if (!entry) continue;
  targets.set(entry.sourceKey, n);
}
const ledger = JSON.parse(await read('content/explanations/review-ledger.json'));
let patched = 0;
const expected = new Set([2,3,4,5,6,7,8,10,11,12,13,14,16,18,23,25,28,29,30,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]);
for (const entry of ledger.entries) {
  const n = targets.get(entry.sourceKey);
  if (!n) continue;
  if (!expected.has(n)) continue;
  if (entry.answerSha256 !== byFile.get('concurrency-advanced-' + n + '.md').answerSha256) {
    throw new Error('sha mismatch for concurrency-advanced-' + n);
  }
  entry.factualReview = { status: 'verified', applicableVersion: version, evidence: evidence[n], reviewer };
  patched++;
}
if (patched !== expected.size) throw new Error('expected ' + expected.size + ' patches, got ' + patched);
await writeFile(new URL('content/explanations/review-ledger.json', root), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
console.log('Patched factual review for ' + patched + ' concurrency-advanced questions.');
