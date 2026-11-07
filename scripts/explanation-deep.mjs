import assert from 'node:assert/strict';

export const deepMarker = '<!-- explanation:deep -->';
const headings = ['参考回答', '参考分析', '案例', '总结点'];

/** Rich answers retain a short spoken opening, then own their reasoning and failure evidence. */
export function validateDeepContent(value, key, title) {
  assert.equal(value.title, title, key + ': title changed');
  assert.ok(typeof value.scenario === 'string' && value.scenario.length >= 30 && value.scenario.length <= 400 && !/[\r\n]/.test(value.scenario), key + ': concrete scenario required');
  for (const field of ['answer', 'summary']) {
    const max = field === 'answer' ? 180 : 60;
    assert.ok(Array.isArray(value[field]) && value[field].length >= 2 && value[field].length <= 5, key + ': invalid ' + field);
    for (const point of value[field]) assert.ok(typeof point === 'string' && point.trim() && !/[\r\n]/.test(point) && [...point].length <= max, key + ': invalid short point');
  }
  for (const field of ['analysis', 'case']) {
    assert.ok(Array.isArray(value[field]) && value[field].length >= (field === 'analysis' ? 3 : 2) && value[field].length <= 6, key + ': reasoning and cases required');
    for (const block of value[field]) {
      assert.ok(typeof block.title === 'string' && block.title.trim() && block.title.length <= 65 && !/[\r\n]/.test(block.title), key + ': invalid subsection');
      assert.ok(typeof block.body === 'string' && block.body.trim().length >= 80 && block.body.length <= 6000 && !/^#{1,6}\s/m.test(block.body), key + ': substantive paragraphs required');
    }
  }
  assert.ok(value.case.some(block => /验证|预期|结果/.test(block.body)), key + ': observable result required');
  assert.ok(Array.isArray(value.references) && value.references.length >= 1, key + ': references required');
  for (const reference of value.references) {
    const url = new URL(reference);
    assert.ok(url.protocol === 'https:' && !url.username && !url.password, key + ': invalid source URL');
  }
  validateDeepMarkdown(renderDeepContent(value), key);
}

const numbered = items => items.map((text, i) => `${i + 1}. ${text}`).join('\n');
const subsections = items => items.map(block => `### ${block.title}\n\n${block.body.trim()}`).join('\n\n');
export function renderDeepContent(value) {
  return `## 参考回答\n\n${deepMarker}\n\n> 场景与约束：${value.scenario}\n\n${numbered(value.answer)}\n\n## 参考分析\n\n${subsections(value.analysis)}\n\n## 案例\n\n${subsections(value.case)}\n\n## 总结点\n\n${numbered(value.summary)}\n`;
}

/** Same size, fence and terminal-summary guarantees as the compact publication format. */
export function validateDeepMarkdown(source, name) {
  assert.ok(source.length <= 100_000 && source.includes(deepMarker), name + ': invalid deep answer');
  assert.ok(!/待补充|待完善|\bTODO\b|xxxx/.test(source), name + ': unfinished content');
  const found = [], blocks = [];
  let fence, subsections = 0;
  for (const line of source.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) {
        assert.ok(['参考分析', '案例'].includes(found.at(-1)), name + ': code must explain mechanism or case');
        fence = {char: marker[1][0], size: marker[1].length};
      } else if (marker[1][0] === fence.char && marker[1].length >= fence.size && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (fence) continue;
    if (/^#{1,6}\s/.test(line)) {
      if (line.startsWith('## ')) { found.push(line.slice(3).trim()); blocks.push([]); }
      else {
        assert.ok(line.startsWith('### ') && ['参考分析', '案例'].includes(found.at(-1)), name + ': invalid subsection');
        blocks.at(-1).push(line); subsections++;
      }
    } else if (blocks.length && line.trim() && line !== deepMarker) blocks.at(-1).push(line);
  }
  assert.ok(!fence, name + ': unclosed code');
  assert.deepEqual(found, headings, name + ': invalid sections');
  assert.ok(subsections >= 5, name + ': missing reasoning');
  for (const index of [0, 3]) {
    let count = 0;
    for (const line of blocks[index]) {
      if (index === 0 && line.startsWith('> 场景与约束：')) continue;
      const point = line.match(/^(\d+)\.\s+(.+)$/);
      assert.ok(point && Number(point[1]) === ++count && [...point[2]].length <= (index === 0 ? 180 : 60), name + ': invalid opening/summary');
    }
    assert.ok(count >= 2 && count <= 5, name + ': invalid opening/summary count');
  }
  for (const index of [1, 2]) {
    const count = blocks[index].filter(line => line.startsWith('### ')).length;
    assert.ok(count >= (index === 1 ? 3 : 2) && count <= 6 && blocks[index].join('\n').length >= 240, name + ': empty reasoning/case');
  }
  assert.ok(/验证|预期|结果/.test(blocks[2].join('\n')), name + ': missing observable outcome');
  const images = [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(images.length <= 1 && images.every(url => /^\/explanations\/[a-z0-9-]+\.svg$/.test(url)), name + ': invalid diagram');
  return images;
}
