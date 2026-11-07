import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { validateQuestionContent, renderQuestionContent } from '../explanation-content.mjs';
import { publishExplanations } from '../publish-explanations.mjs';
import { fileURLToPath } from 'node:url';
import { referenceTitle } from '../explanation-references.mjs';
import { validateExplanationMarkdown } from '../explanation-markdown.mjs';
import { loadQuestionContents } from '../question-contents.mjs';

const root = new URL('../../', import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(new URL(path, root), 'utf8');
const manifest = JSON.parse(await read('content/senior/manifest.json'));
const topicFiles = (await readdir(new URL('content/explanations/topics/', root))).filter(name => name.endsWith('.tsv')).sort();
const topics = (await Promise.all(topicFiles.map(name => read('content/explanations/topics/' + name)))).join('\n').split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#')).map(line => {
  const [id, modules, keywords, answer, analysis, scenario, action, expected, summary, code = '', diagram = ''] = line.split('\t').map(field => field.trim());
  assert.ok(id && summary, 'Incomplete topic: ' + id);
  return { id, modules: modules.split(','), keywords: keywords.split(','), answer: answer.split('；'), analysis: analysis.split('；'), scenario, action, expected, summary: summary.split('；'), code, diagram };
});
const codes = JSON.parse(await read('content/explanations/code-examples.json'));
const overrides = JSON.parse(await read('content/explanations/topic-overrides.json'));
const legacyAnswers = JSON.parse(await read('content/explanations/legacy-answers.json'));
const sampleMap = { 'java-language/1': 'java-language-001.md', 'spring-advanced/1': 'spring-advanced-001.md', 'database-advanced/26': 'database-advanced-026.md' };
const questionContents = await loadQuestionContents();
const reviewedFixes = JSON.parse(await read('content/explanations/review-fixes-20261020.json'));
for (const fix of reviewedFixes.changes) {
  assert.equal(questionContents.questions[fix.key]?.title,fix.title,'Reviewed correction must not fall back to topic content: '+fix.key);
}
assert.equal(questionContents.version, 1, 'Unsupported question content format');
assert.ok(questionContents.questions && typeof questionContents.questions === 'object');
assert.equal(new Set(topics.map(topic => topic.id)).size, topics.length, 'Duplicate concept IDs');
const versionNote = module => module.startsWith('spring') ? 'Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。'
  : module.startsWith('database') ? 'MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。'
  : /^(java|collections|concurrency|jvm|algorithms)/.test(module) ? 'Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。'
  : module.startsWith('ai-') ? '模型和接口能力以实际版本为准；教学场景不代表生产效果。'
  : '教学设计场景；容量、一致性和恢复承诺需按实际约束验证。';
const referencesFor = question => question.references.map(url => url.replace('spring-framework/reference/', 'spring-framework/reference/6.2/'));
const referenceName = url => url.includes('oracle.com') ? 'Java 17 规范与 API' : url.includes('spring.io') ? 'Spring Framework 6.2 参考'
  : url.includes('mysql.com') ? 'MySQL 8.4 参考' : url.includes('redis.io') ? 'Redis 官方文档' : url.includes('kafka.apache') ? 'Kafka 4.1 设计'
  : url.includes('arxiv.org') ? '原始研究论文' : url.includes('owasp.org') ? 'OWASP 提示注入风险' : url.includes('sre.google') ? 'Google SRE'
  : url.includes('raft.github') ? 'Raft 论文' : 'HTTP 语义规范';
const specificReferenceName = referenceTitle;
const normalize = value => value.toLowerCase().replace(/[\s`*\\]/g, '');
const catalog = [];
for (const module of manifest.modules) {
  const lines = (await read('content/senior/' + module.file)).trim().split(/\r?\n/);
  lines.forEach((line, index) => {
    const [title, points] = line.split('\t');
    catalog.push({ key: `${module.id}/${index + 1}`, module: module.id, title, sourceKey: hash(`senior-v1/${module.id}/${index + 1}`),
      baseline: '### 参考要点\n\n' + points.replaceAll('；', '。\n\n'), points, references: module.references });
  });
}
let section = '未分类', category = '未分类', title, number, answer = [], fence = false;
function legacy() {
  if (!title) return;
  const nonempty = answer.filter(line => line.trim());
  const indented = nonempty.every(line => line.startsWith('    '));
  const baseline = answer.map(line => indented && line.startsWith('    ') ? line.slice(4) : line).join('\n').trim();
  const module = manifest.modules.find(item => item.category === category);
  assert.ok(module, 'Unknown legacy category: ' + category);
  catalog.push({ key: `legacy/${catalog.filter(item => item.key.startsWith('legacy/')).length + 1}`, module: module.id,
    title, sourceKey: hash(section + '/' + number), baseline, points: '', references: module.references });
  title = undefined; answer = [];
}
for (const line of (await read('content/Java.md')).replaceAll('\r\n', '\n').split('\n')) {
  if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) { fence = !fence; if (title) answer.push(line); continue; }
  const heading = !fence && line.match(/^(#{1,3})\s+(.+)$/);
  const question = !fence && line.match(/^\s{0,3}(\d+)[.)]\s+(.+)$/);
  if (heading) { legacy(); if (heading[1].length === 2) { section = heading[2]; category = section; } else if (heading[1].length === 3) category = heading[2]; }
  else if (question) { legacy(); number = question[1]; title = question[2].trim(); }
  else if (title) answer.push(line);
}
legacy();
assert.equal(catalog.length, 1215, 'Expected 1050 senior and 165 original questions');
const byKey = new Map(catalog.map(question => [question.key, question]));
for (const [key, content] of Object.entries(questionContents.questions)) {
  assert.ok(byKey.has(key), 'Unknown question content key: ' + key);
  validateQuestionContent(content, key, byKey.get(key).title);
}

const unmatched = [], assignments = [];
for (const question of catalog) {
  const normalized = normalize(question.title);
  const candidates = topics.filter(topic => topic.modules.includes(question.module)).map(topic => {
    const matches = topic.keywords.filter(key => /^@\d+$/.test(key)
      ? !question.key.startsWith('legacy/') && question.key.endsWith('/' + key.slice(1))
      : key.split('&').every(part => normalized.includes(normalize(part))));
    return { topic, score: matches.length ? Math.max(...matches.map(key => /^@\d+$/.test(key) ? 10000 : normalize(key).length)) + matches.length / 100 : 0 };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  const selected = overrides[question.key] ? topics.find(topic => topic.id === overrides[question.key]) : candidates[0]?.topic;
  if (!selected) unmatched.push({ key: question.key, title: question.title });
  else assignments.push({ question, topic: selected });
}
await mkdir(new URL('content/explanations/generated/', root), { recursive: true });
const questionSpecific = Object.keys(questionContents.questions).length;
const sampleSpecific = Object.keys(sampleMap).filter(key => !questionContents.questions[key]).length;
await writeFile(new URL('content/explanations/coverage.json', root), JSON.stringify({ total: catalog.length, matched: assignments.length, topics: topics.length, unmatched,
  qualityReview: { questionSpecific, sampleSpecific, remainingTopicContent: catalog.length - questionSpecific - sampleSpecific, deepFormat: Object.values(questionContents.questions).filter(value => value.format === 'deep').length, allQuestionsIndividuallyReviewed: false } }, null, 2));
await writeFile(new URL('content/explanations/assignments.json', root), JSON.stringify(assignments.map(({question, topic}) => ({ key: question.key, title: question.title, topic: topic.id,
  contentSource: questionContents.questions[question.key] ? 'question' : sampleMap[question.key] ? 'sample' : 'topic' })), null, 2));
await writeFile(new URL('content/explanations/review-status.json',root),JSON.stringify({
  generatedAt:new Date().toISOString(),
  meaning:'结构覆盖不等于事实审查完成；sharedTopic 需要逐题核对分析、案例与问题是否对应。',
  modules:manifest.modules.map(module=>{
    const items=assignments.filter(({question})=>question.module===module.id);
    const specific=items.filter(({question})=>questionContents.questions[question.key]).length;
    const samples=items.filter(({question})=>sampleMap[question.key]&&!questionContents.questions[question.key]).length;
    return {module:module.id,total:items.length,questionSpecific:specific,sampleSpecific:samples,sharedTopic:items.length-specific-samples};
  })
},null,2));
if (unmatched.length) { console.log(JSON.stringify(unmatched, null, 2)); process.exitCode = 1; }
else {
  const numbered = items => items.map((text, index) => `${index + 1}. ${text.trim().replace(/[。；]+$/, '')}。`).join('\n');
  const artifacts = [];
  for (const { question, topic } of assignments) {
    const specific = questionContents.questions[question.key];
    const points = question.points ? question.points.replace(/[。]$/, '').split(/[；。]/).map(text => text.trim()).filter(Boolean) : legacyAnswers[question.key.split('/')[1]];
    assert.ok(points?.length >= 2, 'Missing focused reference answer: ' + question.key);
    let content = `## 参考回答\n\n${numbered(points)}\n\n## 参考分析\n\n${numbered(topic.analysis)}\n\n## 案例\n\n1. 场景（教学示例）：${topic.scenario.replace(/^教学场景：/, '')}。\n2. 处理：${topic.action}。\n`;
    if (topic.diagram) content += `\n![${topic.scenario}](/explanations/${topic.diagram}.svg)\n`;
    if (topic.code) { assert.ok(codes[topic.code], 'Unknown code: ' + topic.code); content += `\n\`\`\`${codes[topic.code].language}\n${codes[topic.code].source}\n\`\`\`\n`; }
    content += `\n3. 验证：${topic.expected}。\n\n## 总结点\n\n${numbered(topic.summary)}\n`;
    if (specific) content = renderQuestionContent(specific);
    else if (sampleMap[question.key]) { const sample = await read('content/explanations/samples/' + sampleMap[question.key]); content = sample.slice(sample.indexOf('## 参考回答')).trim() + '\n'; }
    const references = specific ? specific.references : referencesFor(question);
    const links = references.map((url, index) => `- [${(specific ? specificReferenceName : referenceName)(url)} · ${index + 1}](${url})`).join('\n');
    content = `<details class="explanation-references">\n<summary>适用范围与模块参考资料</summary>\n\n${versionNote(question.module)}\n\n${links}\n\n</details>\n\n` + content;
    for(const image of validateExplanationMarkdown(content,question.key))
      await access(new URL('frontend/public'+image,root));
    const file = 'generated/' + question.key.replaceAll('/', '-') + '.md';
    const entry={ sourceKey: question.sourceKey, title: question.title, baselineAnswerSha256: hash(question.baseline), answerSha256: hash(content), file, topic: topic.id, references };
    artifacts.push({entry,content});
  }
  await publishExplanations(fileURLToPath(new URL('content/explanations/',root)),'explanations-v18',artifacts);
  // Editable review copies are separate from the immutable files read by the backend.
  for (const {entry,content} of artifacts) await writeFile(new URL('content/explanations/'+entry.file,root),content);
  console.log(`Built ${artifacts.length} explanations; ${questionSpecific} question-specific corrections. Shared topic content still requires individual review.`);
}
