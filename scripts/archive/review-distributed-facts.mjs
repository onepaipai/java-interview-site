import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const reviewer = 'zcode-review-20261024';
const version = 'Java 17 / MySQL 8.4';
const jls17 = 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html';
const raft = 'https://raft.github.io/raft.pdf';
const sre = 'https://sre.google/sre-book/table-of-contents/';
const redisPat = 'https://redis.io/docs/latest/develop/use/patterns/distributed-locks/';
const juc = 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html';

const evidence = {
  4: [jls17, raft], 15: [redisPat, raft], 17: [jls17, raft], 18: [juc, redisPat], 19: [juc, sre],
};

const expected = new Set(Object.keys(evidence).map(Number));
const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const byFile = new Map(manifest.entries.map(e => [e.file.slice(e.file.lastIndexOf('/') + 1), e]));
const ledger = JSON.parse(await read('content/explanations/review-ledger.json'));
let patched = 0;
for (const [key, ev] of Object.entries(evidence)) {
  const n = parseInt(key);
  const f = byFile.get('distributed-' + n + '.md');
  if (!f) throw new Error('missing manifest entry for distributed-' + n);
  const entry = ledger.entries.find(x => x.sourceKey === f.sourceKey);
  if (!entry) throw new Error('missing ledger entry for distributed-' + n);
  if (entry.answerSha256 !== f.answerSha256) throw new Error('sha mismatch for distributed-' + n);
  entry.factualReview = { status: 'verified', applicableVersion: version, evidence: ev, reviewer };
  patched++;
}
if (patched !== expected.size) throw new Error('expected ' + expected.size + ', got ' + patched);
await writeFile(new URL('content/explanations/review-ledger.json', root), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
console.log('Patched factual review for ' + patched + ' distributed questions.');
