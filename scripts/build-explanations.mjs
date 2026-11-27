import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateQuestionContent, renderQuestionContent } from './explanation-content.mjs';
import { publishExplanations } from './publish-explanations.mjs';
import { validateExplanationMarkdown } from './explanation-markdown.mjs';
import { loadQuestionContents } from './question-contents.mjs';
import { referenceTitle } from './explanation-references.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => readFile(path.join(root, file), 'utf8');
const write = (file, text) => writeFile(path.join(root, file), text, 'utf8');
const newVersion = 'explanations-v38';

const oldManifest = JSON.parse(await read('content/explanations/manifest.json'));
const seniorManifest = JSON.parse(await read('content/senior/manifest.json'));
const { questions } = await loadQuestionContents();

const fileName = key => key.replaceAll('/', '-') + '.md';
const sourceKey = key => hash('senior-v1/' + key);

const versionNote = module => {
  if (module.startsWith('spring')) return 'Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。';
  if (module.startsWith('database')) return 'MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。';
  if (/^(java|collections|concurrency|jvm|algorithms)/.test(module)) return 'Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。';
  if (module.startsWith('ai-')) return '模型和接口能力以实际版本为准；教学场景不代表生产效果。';
  return '教学设计场景；容量、一致性和恢复承诺需按实际约束验证。';
};
const links = references => references.map((url, index) => `- [${referenceTitle(url)} · ${index + 1}](${url})`).join('\n');
const withReferences = (module, references, body) =>
  `<details class="explanation-references">\n<summary>适用范围与模块参考资料</summary>\n\n${versionNote(module)}\n\n${links(references)}\n\n</details>\n\n` + body;

// 旧条目整体沿用已发布正文；只在题目级正文确实变化时重建，并保留其规则性引用块。
const artifacts = [];
const existingByKey = new Map();
const normalize = url => url.replace(/(\.html)+\.html$/, '.html');

// senior 题的 baseline 必须始终等于当前 TSV 短答案，否则导入器无法安全升级。
const seniorBaseline = new Map();
for (const module of seniorManifest.modules) {
  const rows = (await read('content/senior/' + module.file)).trim().split(/\r?\n/);
  rows.forEach((row, i) => {
    const points = row.split('\t')[1];
    seniorBaseline.set(`${module.id}-${i + 1}.md`, hash('### 参考要点\n\n' + points.replaceAll('；', '。\n\n')));
  });
}

for (const entry of oldManifest.entries) {
  const source = await read('content/explanations/generated/' + path.basename(entry.file));
  let content = source;
  let references = (entry.references || []).map(normalize);
  const baseName = path.basename(entry.file);
  const baseline = seniorBaseline.get(baseName) ?? entry.baselineAnswerSha256;
  const bodyKey = Object.keys(questions).find(k => fileName(k) === path.basename(entry.file));
  if (bodyKey) {
    const question = questions[bodyKey];
    validateQuestionContent(question, bodyKey, entry.title);
    const rendered = renderQuestionContent(question);
    const marker = source.indexOf('## 参考回答');
    assert.ok(marker > 0, entry.file + ': no body marker');
    const body = source.slice(marker);
    references = question.references.map(normalize);
    // 正文或引用变化（含历史 .html.html 坏链）时，用正确引用整篇重建
    const badLinks = (entry.references || []).some(u => u.includes('.html.html'));
    if (body !== rendered || badLinks || references.join() !== (entry.references || []).join()) {
      content = withReferences(bodyKey.split('/')[0], references, rendered);
      existingByKey.set(bodyKey, content);
    }
  }
  validateExplanationMarkdown(content, entry.file);
  artifacts.push({ entry: { ...entry, file: 'generated/' + baseName, references, baselineAnswerSha256: baseline, answerSha256: hash(content) }, content });
}

// 新题：文件名不在旧清单中，直接生成并追加。
const existingFiles = new Set(oldManifest.entries.map(entry => path.basename(entry.file)));
for (const module of seniorManifest.modules) {
  const rows = (await read('content/senior/' + module.file)).trim().split(/\r?\n/);
  for (const [index, row] of rows.entries()) {
    const [title, points] = row.split('\t');
    const key = `${module.id}/${index + 1}`;
    const file = fileName(key);
    if (existingFiles.has(file)) {
      assert.equal(oldManifest.entries.find(entry => path.basename(entry.file) === file).title, title, key + ': title changed');
      continue;
    }
    const question = questions[key];
    assert.ok(question, 'missing answer content for new question: ' + key);
    validateQuestionContent(question, key, title);
    const baseline = '### 参考要点\n\n' + points.replaceAll('；', '。\n\n');
    const content = withReferences(module.id, question.references, renderQuestionContent(question));
    validateExplanationMarkdown(content, key);
    artifacts.push({
      entry: {
        sourceKey: sourceKey(key),
        title,
        baselineAnswerSha256: hash(baseline),
        answerSha256: hash(content),
        file: 'generated/' + file,
        topic: 'question-specific',
        references: question.references,
      },
      content,
    });
  }
}

assert.equal(new Set(artifacts.map(item => item.entry.sourceKey)).size, artifacts.length);
assert.equal(new Set(artifacts.map(item => item.entry.file)).size, artifacts.length);
const manifest = await publishExplanations(path.join(root, 'content/explanations/'), newVersion, artifacts);
await mkdir(path.join(root, 'content/explanations/generated/'), { recursive: true });
for (const { entry, content } of artifacts)
  await write('content/explanations/generated/' + path.basename(entry.file), content);

const coverage = JSON.parse(await read('content/explanations/coverage.json'));
coverage.total = artifacts.length;
coverage.matched = artifacts.length;
coverage.qualityReview.questionSpecific = Object.keys(questions).length;
coverage.qualityReview.deepFormat = Object.values(questions).filter(value => value.format === 'deep').length;
coverage.qualityReview.allQuestionsIndividuallyReviewed = false;
await write('content/explanations/coverage.json', JSON.stringify(coverage, null, 2) + '\n');

const assignments = JSON.parse(await read('content/explanations/assignments.json'));
const assigned = new Set(assignments.map(item => item.key));
for (const module of seniorManifest.modules) {
  const rows = (await read('content/senior/' + module.file)).trim().split(/\r?\n/);
  for (const [index, row] of rows.entries()) {
    const key = `${module.id}/${index + 1}`;
    if (assigned.has(key)) continue;
    assignments.push({ key, title: row.split('\t')[0], topic: 'question-specific', contentSource: 'question' });
  }
}
// 全库已逐题编写正文，历史 topic 级来源标记必须同步，避免与 coverage 的 remainingTopicContent=0 矛盾
for (const item of assignments) item.contentSource = 'question';
await write('content/explanations/assignments.json', JSON.stringify(assignments, null, 2) + '\n');

const readRows = async file => (await read('content/senior/' + file)).trim().split(/\r?\n/);
const reviewStatus = {
  generatedAt: new Date().toISOString(),
  meaning: '结构覆盖不等于事实审查完成；全库均为题目级正文（senior 21 模块 + 165 道原始题），审核结论以 review-ledger.json 为准。',
  modules: [],
};
for (const module of seniorManifest.modules) {
  const total = (await readRows(module.file)).length;
  reviewStatus.modules.push({ module: module.id, total, questionSpecific: total, sampleSpecific: 0, sharedTopic: 0 });
}
reviewStatus.modules.push({ module: 'legacy', total: artifacts.length - reviewStatus.modules.reduce((n, m) => n + m.total, 0), questionSpecific: artifacts.length - reviewStatus.modules.reduce((n, m) => n + m.total, 0), sampleSpecific: 0, sharedTopic: 0 });
await write('content/explanations/review-status.json', JSON.stringify(reviewStatus, null, 2) + '\n');

console.log(`Built ${artifacts.length} explanations; pack ${manifest.version}; ${Object.keys(questions).length} question-specific answers; rebuilt ${existingByKey.size} changed answers.`);
