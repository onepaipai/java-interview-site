import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + n + '.html';
const jls17 = 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html';
const juc = api('java/util/concurrent/package-summary');
const reviewer = 'zcode-review-20261024';
const version = 'Java 17';

const evidence = {
  1: [jls17, juc], 2: [jls17, juc], 3: [jls17, api('java/lang/Enum.html')],
  4: [jls17, api('java/lang/Object.html')], 5: [jls17, api('java/lang/String.html')],
  6: [api('java/lang/Object.html'), jls17], 7: [api('java/lang/Object.html'), api('java/lang/Thread.html')],
  8: [api('java/lang/Object.html')], 9: [api('java/lang/Thread.html'), juc],
  10: [api('java/lang/Thread.html'), api('java/util/concurrent/ExecutorService.html')],
  11: [api('java/lang/ThreadLocal.html'), juc], 12: [api('java/lang/ThreadLocal.html'), api('java/lang/Thread.html')],
  13: [api('java/util/concurrent/atomic/AtomicLong.html'), api('java/util/concurrent/atomic/LongAdder.html')],
  14: [api('java/util/concurrent/atomic/AtomicStampedReference.html'), juc],
  15: [api('java/util/concurrent/atomic/LongAdder.html'), api('java/util/concurrent/atomic/AtomicLong.html')],
  16: [api('java/util/concurrent/ThreadPoolExecutor.html'), juc], 17: [api('java/util/concurrent/ThreadPoolExecutor.html'), juc],
  18: [api('java/util/concurrent/ThreadPoolExecutor.html'), juc],
  19: [api('java/util/concurrent/ExecutorService.html'), api('java/util/concurrent/Future.html')],
  20: [api('java/util/concurrent/ThreadPoolExecutor.html'), api('java/util/concurrent/ExecutorService.html')],
  21: [api('java/util/concurrent/CountDownLatch.html'), api('java/util/concurrent/CyclicBarrier.html')],
  22: [api('java/util/concurrent/Semaphore.html'), juc],
  23: [api('java/util/concurrent/locks/ReentrantLock.html'), jls17],
  24: [api('java/util/concurrent/locks/ReentrantLock.html'), juc],
  25: [api('java/util/concurrent/locks/ReadWriteLock.html'), api('java/util/concurrent/locks/StampedLock.html')],
  26: [api('java/util/concurrent/locks/Condition.html'), api('java/util/concurrent/locks/ReentrantLock.html')],
  27: [api('java/util/concurrent/Future.html'), api('java/util/concurrent/CompletableFuture.html')],
  28: [api('java/util/concurrent/CompletableFuture.html'), juc], 29: [api('java/util/concurrent/CompletableFuture.html'), juc],
  30: [api('java/lang/ThreadLocal.html'), juc], 31: [api('java/util/concurrent/CountDownLatch.html'), juc],
  32: [jls17, juc], 33: [juc, api('java/lang/Thread.html')],
  34: [api('java/util/concurrent/ThreadPoolExecutor.html'), juc],
  35: [api('java/util/concurrent/ThreadPoolExecutor.html'), api('java/util/concurrent/CompletableFuture.html')],
  36: [jls17, juc], 37: [jls17, api('java/util/concurrent/atomic/AtomicBoolean.html')],
  38: [jls17, juc], 39: [api('java/util/concurrent/ConcurrentHashMap.html'), juc],
  40: [jls17, juc], 41: [api('java/util/concurrent/BlockingQueue.html'), juc],
  42: [api('java/util/concurrent/ScheduledExecutorService.html'), api('java/util/Timer.html')],
  43: [api('java/util/Timer.html'), api('java/util/concurrent/ScheduledExecutorService.html')],
  44: [api('java/util/concurrent/Semaphore.html'), api('java/util/concurrent/locks/ReentrantLock.html')],
  45: [api('java/util/concurrent/Future.html'), juc],
  46: [api('java/util/concurrent/ConcurrentHashMap.html'), juc],
  47: [api('java/util/concurrent/atomic/LongAdder.html'), juc],
  48: [api('java/util/concurrent/locks/ReentrantLock.html'), jls17],
  49: [api('java/lang/Thread.html'), juc],
  50: [api('java/lang/Thread.html'), api('java/util/concurrent/ThreadPoolExecutor.html')],
};

const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const byFile = new Map(manifest.entries.map(e => [e.file.slice(e.file.lastIndexOf('/') + 1), e]));
const targets = new Map();
for (let n = 1; n <= 50; n++) {
  const entry = byFile.get('concurrency-basics-' + n + '.md');
  if (!entry) throw new Error('missing manifest entry for concurrency-basics-' + n);
  targets.set(entry.sourceKey, n);
}
const ledger = JSON.parse(await read('content/explanations/review-ledger.json'));
let patched = 0;
for (const entry of ledger.entries) {
  const n = targets.get(entry.sourceKey);
  if (!n) continue;
  if (entry.answerSha256 !== byFile.get('concurrency-basics-' + n + '.md').answerSha256) {
    throw new Error('sha mismatch for concurrency-basics-' + n);
  }
  entry.factualReview = { status: 'verified', applicableVersion: version, evidence: evidence[n], reviewer };
  patched++;
}
if (patched !== 50) throw new Error('expected 50 patches, got ' + patched);
await writeFile(new URL('content/explanations/review-ledger.json', root), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
console.log('Patched factual review for ' + patched + ' concurrency-basics questions.');
