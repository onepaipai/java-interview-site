import assert from 'node:assert/strict';
import answers from '../content/explanations/answers/deep-answers.mjs';
import { validateQuestionContent, renderQuestionContent } from './explanation-content.mjs';
import { validateExplanationMarkdown } from './explanation-markdown.mjs';

assert.equal(Object.keys(answers).length, 12);
for (const [key, value] of Object.entries(answers)) {
  validateQuestionContent(value, key, value.title);
  const body = renderQuestionContent(value);
  validateExplanationMarkdown(body, key);
  assert.ok(body.length > 1300, key + ': cannot silently fall back to a topic outline');
  for (const invalid of [body + '\n未编号尾注', body.replace('## 参考分析', '## 错误分段'), body.replace(/^### /m, '# ')]) {
    assert.throws(() => validateExplanationMarkdown(invalid, key));
  }
  const incomplete = structuredClone(value);
  incomplete.analysis = incomplete.analysis.slice(0, 1);
  assert.throws(() => validateQuestionContent(incomplete, key, value.title));
}
// Independently check the numerical examples and the two failure protocols in the prose.
const capacity = 20 / 0.1;
assert.equal(capacity, 200);
assert.equal(40 / capacity, 0.2);
assert.equal(20 / 0.5, 40);
assert.equal(180 - 40, 140);
const resource = { token: 0, value: '' };
const write = (token, value) => {
  if (token <= resource.token) return false;
  Object.assign(resource, { token, value }); return true;
};
assert.equal(write(42, 'new'), true);
assert.equal(write(41, 'old'), false);
assert.equal(write(42, 'retry'), false);
assert.equal(resource.value, 'new');
let balance = 100;
const processed = new Set();
function consume(id) { if (processed.has(id)) return; balance -= 10; processed.add(id); }
consume('fixed-event'); consume('fixed-event');
assert.equal(balance, 90);
console.log('PASS: 12 complete question-owned answers; publication rejection, capacity arithmetic, single-write fencing and replay models. Models do not replace real middleware tests.');
