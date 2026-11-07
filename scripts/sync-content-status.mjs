import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { validateExplanationMarkdown } from './explanation-markdown.mjs';
import {loadQuestionContents} from './question-contents.mjs';

const check = process.argv.includes('--check');
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const coverage = JSON.parse(await read('content/explanations/coverage.json'));
const {questions} = await loadQuestionContents();
let previous = { entries: [] };
try { previous = JSON.parse(await read('content/explanations/review-ledger.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const old = new Map(previous.entries.map(entry => [entry.sourceKey, entry]));
const entries = [];
for (const entry of manifest.entries) {
  const content = await read('content/explanations/' + entry.file);
  const hash = createHash('sha256').update(content).digest('hex');
  assert.equal(hash, entry.answerSha256);
  validateExplanationMarkdown(content, entry.file);
  const baseline = old.get(entry.sourceKey);
  const unchanged = baseline?.answerSha256 === hash && baseline?.title === entry.title;
  entries.push({
    sourceKey: entry.sourceKey, title: entry.title, answerSha256: hash,
    structure: 'validated',
    example: unchanged ? baseline.example : { status: 'pending', evidence: [] },
    factualReview: unchanged ? baseline.factualReview : { status: 'pending', applicableVersion: '', evidence: [], reviewer: '' },
    manualMerge: unchanged ? baseline.manualMerge : 'not-assessed',
    history: unchanged ? (baseline.history || []) : [...(baseline?.history || []), ...(baseline ? [{answerSha256:baseline.answerSha256,title:baseline.title,example:baseline.example,factualReview:baseline.factualReview,manualMerge:baseline.manualMerge}] : [])],
  });
}
const ledger = {
  version: 1, packVersion: manifest.version,
  meaning: '结构校验、案例执行、事实核验和业务库人工合并独立记录；正文摘要变化使旧审核证据失效。业务库人工改动由 /api/admin/publications/status 动态判断。',
  entries,
};
const verified = entries.filter(entry => entry.factualReview.status === 'verified');
for(const entry of entries){
  assert.ok(['pending','verified','rejected','stale'].includes(entry.factualReview.status),entry.title+': invalid factual status');
  assert.ok(['pending','executed','not-applicable','failed'].includes(entry.example.status),entry.title+': invalid example status');
  if(entry.example.status==='executed')assert.ok(entry.example.evidence.length,entry.title+': example evidence required');
}
for (const entry of verified) {
  assert.ok(entry.factualReview.applicableVersion && entry.factualReview.reviewer && entry.factualReview.evidence.length, entry.title + ': factual evidence required');
}
const count = { questionSpecific: Object.keys(questions).length, sampleSpecific: coverage.qualityReview.sampleSpecific, remainingTopicContent: coverage.qualityReview.remainingTopicContent };
assert.equal(count.questionSpecific + count.sampleSpecific + count.remainingTopicContent, manifest.count);
const summary = `<!-- content-status:start -->\n当前解析包为 \`${manifest.version}\`，共 ${manifest.count} 道：${count.questionSpecific} 道题目级正文、${count.sampleSpecific} 道固定样例、${count.remainingTopicContent} 道主题正文。独立正文不等于事实核验完成；审核台账中 ${verified.length} 道有完整事实审核证据，其余保持待审核。结构、案例执行、事实核验及人工合并分别记录在 [审核台账](content/explanations/review-ledger.json)。\n<!-- content-status:end -->`;
const outputs = new Map([
  ['content/explanations/review-ledger.json', JSON.stringify(ledger, null, 2) + '\n'],
]);
for (const file of ['README.md', 'content/explanations/README.md']) {
  let text = await read(file);
  const body = file === 'README.md' ? summary : summary.replace('(content/explanations/review-ledger.json)', '(review-ledger.json)');
  if (text.includes('<!-- content-status:start -->')) text = text.replace(/<!-- content-status:start -->[\s\S]*?<!-- content-status:end -->/, body);
  else text = text.replace(/当前解析包为[^\n]+|当前发布为[^\n]+/, body);
  if (file.endsWith('explanations/README.md')) {
    text = text.replace(/当前为 \d+ 道题目级修订及 \d+ 道独立样例。/g, `当前为 ${count.questionSpecific} 道题目级修订及 ${count.sampleSpecific} 道独立样例。`)
      .replace(/剩余 \d+ 道仍使用主题级/g, `剩余 ${count.remainingTopicContent} 道仍使用主题级`);
  }
  outputs.set(file, text);
}
for (const [file, text] of outputs) {
  if (check) assert.equal(await read(file), text, file + ': run node scripts/sync-content-status.mjs');
  else await writeFile(new URL(file, root), text, 'utf8');
}
console.log(`${check ? 'PASS' : 'Updated'}: ${manifest.count} content states; ${verified.length} evidence-backed factual reviews; no unsupported review claims.`);
