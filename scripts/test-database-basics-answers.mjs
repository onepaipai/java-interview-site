import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import answers from '../content/explanations/answers/database-basics-answers.mjs';
import { loadQuestionContents } from './question-contents.mjs';
import { renderQuestionContent, validateQuestionContent } from './explanation-content.mjs';

const root = new URL('../', import.meta.url);
const json = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const { questions } = await loadQuestionContents();
const assignments = await json('content/explanations/assignments.json');
const manifest = await json('content/explanations/manifest.json');
const status = await json('content/explanations/review-status.json');
assert.deepEqual(status.modules.find(item => item.module === 'database-basics'), {
  module: 'database-basics', total: 59, questionSpecific: 59, sampleSpecific: 0, sharedTopic: 0,
});
assert.equal(Object.keys(answers).length, 53);
assert.equal(Object.values(answers).filter(value => value.format === 'deep').length, 12);
const cases = new Set();
for (const [key, value] of Object.entries(answers)) {
  const assignment = assignments.find(item => item.key === key);
  assert.ok(assignment, key);
  validateQuestionContent(value, key, assignment.title);
  assert.deepEqual(questions[key], value);
  assert.equal(assignment.contentSource, 'question');
  const fingerprint = JSON.stringify(value.case);
  assert.ok(!cases.has(fingerprint), key + ': repeated case');
  cases.add(fingerprint);
  const entry = manifest.entries.find(item => item.title === value.title);
  const published = await readFile(new URL('content/explanations/' + entry.file, root), 'utf8');
  assert.ok(published.includes(renderQuestionContent(value).trim()), key + ': published exact content');
}
for (let n = 1; n <= 50; n++) assert.ok(questions['database-basics/' + n]);
for (let n = 42; n <= 50; n++) assert.ok(questions['legacy/' + n]);
assert.match(answers['database-basics/11'].answer.join(''), /多表 UPDATE、DELETE/);
assert.match(answers['database-basics/15'].answer.join(''), /位置不是快照/);
assert.match(answers['database-basics/19'].analysis[0].body, /尚未.*查询/);
assert.match(answers['database-basics/22'].answer.join(''), /READ COMMITTED.*例外/);
assert.match(answers['database-basics/39'].analysis[0].body, /NULL.*多个有效行/);
assert.match(answers['database-basics/49'].answer.join(''), /不能直接判断写入失败/);
const examples = [
  ['database-basics/15', [[['3'], ['2']]], []],
  ['database-basics/24', [[['4', '1']]], [1, 0]],
  ['legacy/47', [[['1', '1'], ['2', '0']], [['1', '1']], [['1', '1']]], []],
];
for (const [key, queries, updates] of examples) {
  const file = key.replace('/', '-');
  const sql = renderQuestionContent(answers[key]).match(/(?:~~~|```)sql\n([\s\S]*?)(?:~~~|```)/)[1].trim();
  const record = await json(`backend/target/database-content-examples/h2/${file}/execution.json`);
  assert.equal(record.sourceSha256, createHash('sha256').update(sql).digest('hex'));
  assert.equal(record.database, 'H2');
  assert.deepEqual(record.queries, queries);
  assert.deepEqual(record.updates, updates);
}
console.log('PASS: all 59 database basics answers independent; 53 new cases, 12 deep answers, 3 exact SQL examples executed on H2. MySQL plans and locks remain separately unverified.');
