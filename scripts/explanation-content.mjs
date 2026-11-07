import assert from 'node:assert/strict';
import { validateDeepContent, renderDeepContent } from './explanation-deep.mjs';

const limits = { answer: [1, 6, 80], analysis: [1, 6, 110], summary: [2, 4, 22] };
const textLength = text => [...text.replace(/[*`]/g, '')].length;

/** A correction owns the full answer; omitted analysis must not fall back to a shared topic. */
export function validateQuestionContent(value, key, expectedTitle) {
  if (value?.format === 'deep') return validateDeepContent(value, key, expectedTitle);
  const fail = message => `${key}: ${message}`;
  assert.ok(value && typeof value === 'object', fail('missing question content'));
  assert.equal(value.title, expectedTitle, fail('title changed; review the question mapping'));
  for (const [field, [min, max, limit]] of Object.entries(limits)) {
    if (field === 'analysis' && !Object.hasOwn(value, field)) continue;
    assert.ok(Array.isArray(value[field]) && value[field].length >= min && value[field].length <= max,
      fail(`${field} needs ${min}–${max} points`));
    for (const point of value[field]) {
      assert.ok(typeof point === 'string' && point.trim() && !/[\r\n]/.test(point), fail(`${field}: one point per line`));
      assert.ok(textLength(point) <= limit, fail(`${field}: point exceeds ${limit} characters`));
    }
  }
  assert.ok(Array.isArray(value.case) && value.case.length >= 2 && value.case.length <= 8, fail('case needs 2–8 steps'));
  let diagrams = 0;
  for (const step of value.case) {
    assert.ok(step && typeof step.text === 'string' && step.text.trim() && !/[\r\n]/.test(step.text)
      && textLength(step.text) <= 140, fail('case step must be concise'));
    if (step.code) {
      assert.match(step.code.language, /^[a-z][a-z0-9-]*$/i, fail('invalid code language'));
      assert.ok(typeof step.code.source === 'string' && step.code.source.trim()
        && step.code.source.length <= 8000 && !/^\s*```/m.test(step.code.source), fail('invalid code body'));
    }
    if (step.diagram) { assert.match(step.diagram, /^[a-z0-9-]+$/); diagrams++; }
  }
  assert.ok(diagrams <= 1, fail('use at most one diagram'));
  assert.ok(value.case.some(step => /预期|结果|验证/.test(step.text)), fail('case needs an observable outcome'));
  assert.ok(Array.isArray(value.references) && value.references.length > 0, fail('missing references'));
  for (const reference of value.references) {
    const url = new URL(reference);
    assert.ok(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password, fail('invalid reference URL'));
  }
}

const numbered = points => points.map((point, index) => `${index + 1}. ${point.trim().replace(/[。；]+$/, '')}。`).join('\n');

export function renderQuestionContent(value) {
  if (value.format === 'deep') return renderDeepContent(value);
  const steps = value.case.map((step, index) => {
    let text = `${index + 1}. ${step.text.trim().replace(/[。；]+$/, '')}。`;
    if (step.diagram) text += `\n\n![${value.title}](/explanations/${step.diagram}.svg)`;
    if (step.code) text += `\n\n\`\`\`${step.code.language}\n${step.code.source.trim()}\n\`\`\``;
    return text;
  }).join('\n\n');
  const analysis = value.analysis ? `## 参考分析\n\n${numbered(value.analysis)}\n\n` : '';
  return `## 参考回答\n\n${numbered(value.answer)}\n\n${analysis}## 案例\n\n${steps}\n\n## 总结点\n\n${numbered(value.summary)}\n`;
}
