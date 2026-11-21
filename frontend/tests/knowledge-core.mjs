import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/knowledge.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const temporaryModule = new URL('.knowledge-core-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.mjs', import.meta.url);
await writeFile(temporaryModule, compiled, { flag: 'wx' });
let groupKnowledgeSources, knowledgeExcerpt;
try { ({ groupKnowledgeSources, knowledgeExcerpt } = await import(temporaryModule.href)); }
finally { await unlink(temporaryModule); }
const chunk = (id, key, part, content = 'G1 资料') => ({
  id, key, chunk: part, title: '同名资料', questionId: key.startsWith('question:') ? Number(key.split(':')[1]) : null, content, score: 1
});
const input = [chunk(4, 'question:7', 2), chunk(8, 'upload:3', 0), chunk(2, 'question:7', 0), chunk(1, 'seed:1', 0), chunk(4, 'question:7', 2)];
const before = JSON.stringify(input), groups = groupKnowledgeSources(input);
assert.equal(groups.map(group => group.key).join(','), 'question:7,upload:3,seed:1', 'preserve source relevance');
assert.equal(groups.map(group => group.kind).join(','), 'question,upload,reference');
assert.equal(groups[0].chunks.map(chunk => chunk.id).join(','), '2,4', 'sort fragments and remove duplicate hits');
assert.equal(groups[0].questionId, 7);
assert.equal(groups.length, 3, 'equal titles must not merge different sources');
assert.equal(JSON.stringify(input), before, 'do not reorder the API response');
const fallback = groupKnowledgeSources([{ ...chunk(1, 'question:7', 0), key: undefined }, { ...chunk(2, 'question:7', 1), key: undefined }]);
assert.equal(fallback.length, 1);
assert.equal(fallback[0].key, 'question:7');
const excerpt = knowledgeExcerpt('开头'.repeat(100) + 'G1 回收边界' + '结尾'.repeat(100), 'g1', 80);
assert.ok(excerpt.includes('G1 回收边界'));
assert.ok(excerpt.startsWith('…') && excerpt.endsWith('…'));
assert.ok(excerpt.length <= 82);
assert.equal(knowledgeExcerpt(' A\n\n B   <img onerror=x> ', 'missing'), 'A B', 'preview removes HTML markup');
assert.equal(knowledgeExcerpt('G1 原理\n<details class="explanation-references"><summary>资料</summary>[规范](https://example.test)</details>\n## 参考回答\n1、**Region** 按需分配。','G1'), 'G1 原理 参考回答 1、Region 按需分配。', 'reference wrappers must not displace useful answer text');
assert.equal(knowledgeExcerpt('<script>alert(1)</script> [参考](https://example.test)\n```java\nint x = 1;\n```','missing'), '参考 int x = 1;', 'hide script blocks, link targets and fence markers');
assert.equal(knowledgeExcerpt('', 'G1'), '');
console.log('PASS: source identity, relevance, fragment order, deduplication, immutable input, matched excerpts and plain-text output');
