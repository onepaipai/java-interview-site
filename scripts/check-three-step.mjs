import { loadQuestionContents } from './question-contents.mjs';
import { renderDeepContent, validateDeepMarkdown } from './explanation-deep.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// 三步走内容与排版综合自检：结构、条理、技术表述、引用链接、发布包一致性。
const { questions } = await loadQuestionContents();
const senior = JSON.parse(await readFile(new URL('../content/senior/manifest.json', import.meta.url), 'utf8'));
const published = JSON.parse(await readFile(new URL('../content/explanations/manifest.json', import.meta.url), 'utf8'));
const hash = s => createHash('sha256').update(s).digest('hex');

const issues = [];
const note = (kind, key, detail) => issues.push({ kind, key, detail });

for (const [key, v] of Object.entries(questions)) {
  const md = renderDeepContent(v);
  try { validateDeepMarkdown(md, key); } catch (e) { note('结构', key, e.message.split('\n')[0]); }

  // 三步走完整性
  if (!/### 第二步扩展/.test(md)) note('三步走', key, '缺第二步');
  if (!/### 第三步发散/.test(md)) note('三步走', key, '缺第三步');
  const answer = md.slice(md.indexOf('## 参考回答'), md.indexOf('## 参考分析'));
  if (!/^\d+\./m.test(answer)) note('三步走', key, '缺第一步编号');

  const stepTwo = [...md.matchAll(/^### 第二步扩展([①②③④⑤⑥])\s·?/gm)].map(m => m[1]);
  const expectedSteps = ['①', '②', '③', '④', '⑤', '⑥'].slice(0, v.analysis?.length || 0);
  if (stepTwo.length !== (v.analysis?.length || 0) || stepTwo.some((step, i) => step !== expectedSteps[i]))
    note('第二步序号', key, '扩展标题序号缺失、不连续或数量不匹配');

  // 排版：围栏配对、粗体闭合、超长列表项、堆段落
  for (const ch of ['```', '~~~'])
    if ((md.split(ch).length - 1) % 2 !== 0) note('围栏', key, ch + ' 不配对');
  for (const line of md.split('\n')) {
    const cleaned = line.replace(/\/\*\*/g, '').replace(/\*\*\//g, '').replace(/\d\*{3}\d/g, '');
    if ((cleaned.match(/\*\*/g) || []).length % 2 !== 0) note('粗体', key, line.slice(0, 50));
  }
  if (/答：见正文机制/.test(md)) note('假答案', key, '存在敷衍答案');

  // 引用链接格式
  for (const url of v.references || []) {
    if (url.includes('.html.html')) note('死链', key, url);
    try { const u = new URL(url); if (u.protocol !== 'https:' && u.protocol !== 'http:') note('引用', key, url); }
    catch { note('引用', key, url); }
  }
}

// 短答案 baseline 与发布包一致
const byFile = new Map(published.entries.map(e => [e.file.split('/').at(-1), e]));
for (const mod of senior.modules) {
  const rows = (await readFile(new URL('../content/senior/' + mod.file, import.meta.url), 'utf8')).trim().split(/\r?\n/);
  for (const [i, row] of rows.entries()) {
    const base = hash('### 参考要点\n\n' + row.split('\t')[1].replaceAll('；', '。\n\n'));
    const e = byFile.get(mod.id + '-' + (i + 1) + '.md');
    if (!e) { note('发布包', mod.id + '/' + (i + 1), '缺条目'); continue; }
    if (e.baselineAnswerSha256 !== base) note('发布包', mod.id + '/' + (i + 1), 'baseline 不一致');
  }
}

// 三步走改造后不应残留绝对化/错误技术表述
const banned = [
  ['偏向锁移除', /JDK ?15 移除偏向锁|JEP 374 已在 15 移除/],
  ['String hash 随机种子', /String[^\n]{0,20}(hash 有随机种子|hash 种子随机化由 JDK 保证)/],
  ['temperature 绝对确定', /temperature ?=? ?0=确定性|temperature=0 确定性\(/],
];
for (const [key, v] of Object.entries(questions)) {
  const s = JSON.stringify(v);
  for (const [name, re] of banned) if (re.test(s)) note('技术表述', key, name);
}

// 内容包元数据一致性：三份清单不能互相矛盾
const coverage = JSON.parse(await readFile(new URL('../content/explanations/coverage.json', import.meta.url), 'utf8'));
const assignments = JSON.parse(await readFile(new URL('../content/explanations/assignments.json', import.meta.url), 'utf8'));
const reviewStatus = JSON.parse(await readFile(new URL('../content/explanations/review-status.json', import.meta.url), 'utf8'));
if (coverage.qualityReview.remainingTopicContent !== 0) note('元数据', 'coverage', '仍有主题级正文');
if (assignments.some(a => a.contentSource !== 'question')) note('元数据', 'assignments', '存在非题目级来源标记');
if (assignments.length !== published.count) note('元数据', 'assignments', '条数与发布包不一致');
const statusTotal = reviewStatus.modules.reduce((n, m) => n + m.total, 0);
if (statusTotal !== published.count || reviewStatus.modules.some(m => m.sharedTopic !== 0))
  note('元数据', 'review-status', '题量或 sharedTopic 与发布包不一致');

if (issues.length) {
  for (const it of issues.slice(0, 40)) console.log(`[${it.kind}] ${it.key} :: ${it.detail}`);
  console.log(`FAIL: ${issues.length} issues`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${Object.keys(questions).length} 题三步走自检通过（结构/条理/引用/发布包/技术表述/元数据）`);
}
