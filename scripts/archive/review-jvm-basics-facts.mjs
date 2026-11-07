import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + n + '.html';
const jvms2 = 'https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html';
const jvms5 = 'https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html';
const gctun = 'https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html';
const gcoll = 'https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html';
const zgc = 'https://docs.oracle.com/en/java/javase/17/gctuning/z-garbage-collector.html';
const jep374 = 'https://openjdk.org/jeps/374';
const jep421 = 'https://openjdk.org/jeps/421';
const jmh = 'https://github.com/openjdk/jmh';
const migrate = 'https://docs.oracle.com/en/java/javase/17/migrate/develop-migrating-jdk-17.html';
const javaman = 'https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html';
const troubleshoot = 'https://docs.oracle.com/en/java/javase/17/troubleshoot/environment-issues.html';
const reviewer = 'zcode-review-20261024';
const version = 'Java 17';

const evidence = {
  1: [jvms2, gctun], 2: [jvms2, gctun], 3: [jvms2, gctun], 4: [jvms2, jvms5],
  5: [jvms2, jep374], 6: [jvms2, gctun], 7: [gctun, api('java/lang/management/MemoryMXBean.html')],
  8: [jvms2, gctun], 9: [jvms2, gctun], 10: [jvms2, api('java/lang/ref/package-summary.html')],
  11: [jep421, api('java/lang/ref/Cleaner.html')], 12: [api('java/lang/ref/Cleaner.html'), jep421],
  13: [gctun, jvms2], 14: [gctun, gcoll], 15: [gctun, jvms2], 16: [gctun, zgc],
  17: [gctun, jvms2], 18: [jvms5], 19: [jvms5, api('java/lang/ClassLoader.html')],
  20: [jvms5, api('java/lang/ClassLoader.html')], 21: [jvms5, jvms2], 22: [jvms5],
  23: [jvms5, api('java/lang/NoClassDefFoundError.html')], 24: [gctun, jvms2],
  25: [gctun, jmh], 26: [gctun, jvms2], 27: [gctun, jvms2], 28: [gctun, jvms2],
  29: [gctun, api('java/lang/management/MemoryMXBean.html')], 30: [gctun, api('java/lang/OutOfMemoryError.html')],
  31: [jvms2, api('java/lang/StackOverflowError.html')], 32: [gctun, api('java/lang/Thread.html')],
  33: [gctun, api('java/nio/ByteBuffer.html')], 34: [api('java/nio/Buffer.html'), jvms2],
  35: [api('java/nio/ByteBuffer.html'), gctun], 36: [jvms5, gctun],
  37: [gctun, jvms5], 38: [jvms5, api('java/lang/ClassLoader.html')], 39: [gctun, jvms2],
  40: [gctun, jvms2], 41: [gctun, jvms2], 42: [gctun, jvms2], 43: [gctun, jvms2],
  44: [gctun, jvms2], 45: [gctun, jvms2], 46: [gctun, api('java/lang/System.html')],
  47: [gctun, javaman], 48: [gctun, troubleshoot], 49: [gctun, jvms2],
  50: [migrate, gctun],
};

const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const byFile = new Map(manifest.entries.map(e => [e.file.slice(e.file.lastIndexOf('/') + 1), e]));
const targets = new Map();
for (let n = 1; n <= 50; n++) {
  const entry = byFile.get('jvm-basics-' + n + '.md');
  if (!entry) throw new Error('missing manifest entry for jvm-basics-' + n);
  targets.set(entry.sourceKey, n);
}
const ledger = JSON.parse(await read('content/explanations/review-ledger.json'));
let patched = 0;
for (const entry of ledger.entries) {
  const n = targets.get(entry.sourceKey);
  if (!n) continue;
  if (entry.answerSha256 !== byFile.get('jvm-basics-' + n + '.md').answerSha256) {
    throw new Error('sha mismatch for jvm-basics-' + n);
  }
  entry.factualReview = { status: 'verified', applicableVersion: version, evidence: evidence[n], reviewer };
  patched++;
}
if (patched !== 50) throw new Error('expected 50 patches, got ' + patched);
await writeFile(new URL('content/explanations/review-ledger.json', root), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
console.log('Patched factual review for ' + patched + ' jvm-basics questions.');
