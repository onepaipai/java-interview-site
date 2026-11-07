import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import answers from '../content/explanations/answers/spring-advanced-answers.mjs';
import { loadQuestionContents } from './question-contents.mjs';
import { renderQuestionContent, validateQuestionContent } from './explanation-content.mjs';

const root = new URL('../', import.meta.url);
const readJson = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const { questions } = await loadQuestionContents();
const assignments = await readJson('content/explanations/assignments.json');
const manifest = await readJson('content/explanations/manifest.json');
const status = await readJson('content/explanations/review-status.json');
assert.deepEqual(status.modules.find(item => item.module === 'spring-advanced'), {
  module: 'spring-advanced', total: 60, questionSpecific: 60, sampleSpecific: 0, sharedTopic: 0,
});
assert.equal(Object.keys(answers).length, 54);
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
  assert.ok(published.includes(renderQuestionContent(value).trim()), key + ': exact published body');
}
for (let n = 1; n <= 50; n++) assert.ok(questions['spring-advanced/' + n]);
for (let n = 83; n <= 92; n++) assert.ok(questions['legacy/' + n]);
assert.match(questions['spring-advanced/3'].answer.join(''), /外层回滚仍会撤销/);
assert.match(questions['spring-advanced/4'].answer.join(''), /捕获异常.*不会自动清除/);
assert.match(questions['spring-advanced/10'].analysis[1].body, /afterCompletion.*特化/);
assert.match(questions['spring-advanced/15'].answer.join(''), /单实例.*不能证明多实例/);
assert.match(questions['spring-advanced/16'].analysis[1].body, /更早读到.*删除后才回填/);
assert.match(questions['spring-advanced/26'].analysis[0], /不自动.*重置/);
assert.match(questions['spring-advanced/34'].answer.join(''), /每读一个字段重新 get/);
for (const [number, name, expected] of [[3, 'PropagationSavepointExample', '[1]:[2]'], [4, 'RollbackOnlyExample', 'true:0'], [19, 'SecurityContextPoolExample', 'alice:anonymous']]) {
  const source = answers['spring-advanced/' + number].case.map(block => block.body).join('\n').match(/~~~java\n([\s\S]*?)\n~~~/)[1].trim();
  const evidence = await readJson(`backend/target/spring-advanced-examples/${name}/execution.json`);
  assert.equal(evidence.sourceSha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(evidence.result, expected);
  assert.match(evidence.runtime, /^17\./);
  assert.match(evidence.springVersion, /^6\.2\./);
}
console.log('PASS: 60 independent Spring advanced answers; 54 new cases, 12 deep explanations and 3 exact Java programs with matching execution evidence.');
