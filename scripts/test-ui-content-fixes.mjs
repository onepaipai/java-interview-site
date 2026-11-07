import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
import answers from '../content/explanations/answers/review-answers-20261023.mjs';
import { loadQuestionContents } from './question-contents.mjs';
import { renderQuestionContent, validateQuestionContent } from './explanation-content.mjs';

const { questions } = await loadQuestionContents();
const assignments = JSON.parse(await readFile(new URL('../content/explanations/assignments.json', import.meta.url), 'utf8'));
for (const q of assignments.filter(q => q.topic === 'api-front')) {
  assert.ok(answers[q.key], q.key + ': review the whole shared group');
  assert.equal(q.contentSource, 'question');
}
for (const [key, value] of Object.entries(answers)) {
  validateQuestionContent(value, key, value.title);
  assert.deepEqual(questions[key], value, key + ': own every section');
}
for (const key of ['architecture/15', 'architecture/16'])
  assert.doesNotMatch(renderQuestionContent(questions[key]), /编辑先查版本|最后写入覆盖|成功提示|未保存离开/);
assert.doesNotMatch(renderQuestionContent(questions['java-language/4']), /读 extends 写 super/);
assert.match(renderQuestionContent(questions['database-basics/6']), /Using index condition/);
assert.match(renderQuestionContent(questions['cache-messaging/4']), /穿透防无效数据反复回源/);
assert.match(renderQuestionContent(questions['ai-basics/13']), /相同最终上下文预算/);
const javaBody = questions['java-language/4'].case.map(block => block.body).join('\n').match(/```java\n([\s\S]*?)\n```/)[1];
const directory = new URL('../backend/target/ui-content-examples/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('GenericErasureReview.java', directory), javaBody);
const { fileURLToPath } = await import('node:url');
const cwd = fileURLToPath(directory);
const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin') : '';
const executable = name => javaBin ? path.join(javaBin, name) : name;
execFileSync(executable('javac'), ['-encoding', 'UTF-8', '-Xlint:unchecked', 'GenericErasureReview.java'], { cwd, stdio: 'pipe' });
const stdout = execFileSync(executable('java'), ['GenericErasureReview'], { cwd, encoding: 'utf8' }).trim().replaceAll('\r', '');
assert.equal(stdout, 'true\nelement cast failed');
await writeFile(new URL('execution.json', directory), JSON.stringify({
  example: 'java-language/4', sourceSha256: createHash('sha256').update(javaBody).digest('hex'),
  runtime: execFileSync(executable('java'), ['--version'], { encoding: 'utf8' }).trim(), stdout,
  check: 'scripts/test-ui-content-fixes.mjs',
}, null, 2));
console.log('PASS: 14 question-owned fixes, complete api-front group, known semantic regressions, and actual Java erasure example.');
