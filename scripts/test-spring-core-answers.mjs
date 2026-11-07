import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import answers from '../content/explanations/answers/spring-core-answers.mjs';
import { loadQuestionContents } from './question-contents.mjs';
import { renderQuestionContent, validateQuestionContent } from './explanation-content.mjs';

const root = new URL('../', import.meta.url);
const readJson = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const { questions } = await loadQuestionContents();
const assignments = await readJson('content/explanations/assignments.json');
const manifest = await readJson('content/explanations/manifest.json');
const status = await readJson('content/explanations/review-status.json');
const moduleStatus = status.modules.find(item => item.module === 'spring-basics');
assert.deepEqual(moduleStatus, { module: 'spring-basics', total: 59, questionSpecific: 59, sampleSpecific: 0, sharedTopic: 0 });
assert.equal(Object.keys(answers).length, 54);
assert.equal(Object.values(answers).filter(value => value.format === 'deep').length, 15);
const uniqueCases = new Set();
for (const [key, value] of Object.entries(answers)) {
  const assignment = assignments.find(item => item.key === key);
  assert.ok(assignment, key + ': stable catalog key required');
  validateQuestionContent(value, key, assignment.title);
  assert.deepEqual(questions[key], value, key + ': owns all sections');
  assert.equal(assignment.contentSource, 'question');
  const caseText = JSON.stringify(value.case);
  assert.ok(!uniqueCases.has(caseText), key + ': copied case');
  uniqueCases.add(caseText);
  const entry = manifest.entries.find(item => item.title === value.title);
  const published = await readFile(new URL('content/explanations/' + entry.file, root), 'utf8');
  assert.ok(published.includes(renderQuestionContent(value).trim()), key + ': published exact body');
}
for (let number = 1; number <= 50; number++) assert.ok(questions['spring-basics/' + number]);
assert.match(questions['spring-basics/4'].analysis[0].body, /解析一次/);
assert.match(questions['spring-basics/9'].analysis[1].body, /并不会.*消失/);
assert.match(questions['spring-basics/13'].answer.join(''), /不能保证/);
assert.match(questions['spring-basics/18'].analysis[2].body, /HandlerMethodValidationException/);
assert.match(questions['spring-basics/23'].answer.join(''), /HttpOnly.*不会阻止/);
assert.match(questions['spring-basics/37'].analysis[1].body, /不是天然恰好一次/);
// Maven compiles and runs these exact printed sources, not hand-maintained replicas.
for (const [number, name, expected] of [[4, 'PrototypeLookupExample', 'true:false'], [7, 'BeanPhasesExample', 'definition:instance'], [9, 'ProxyBoundaryExample', '1:2']]) {
  const source = answers['spring-basics/' + number].case.map(item => item.body).join('\n').match(/~~~java\n([\s\S]*?)\n~~~/)[1].trim();
  const evidence = await readJson(`backend/target/spring-content-examples/${name}/execution.json`);
  assert.equal(evidence.sourceSha256, createHash('sha256').update(source).digest('hex'), name + ': rerun Maven after changing code');
  assert.equal(evidence.result, expected);
  assert.match(evidence.runtime, /^17\./);
  assert.match(evidence.springVersion, /^6\.2\./);
}
console.log('PASS: all 59 Spring core answers are question-specific; 54 new cases, 15 deep answers and 3 exact published Java programs executed on Java 17 / Spring 6.2.');
