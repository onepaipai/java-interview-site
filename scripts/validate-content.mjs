import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../content/senior/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
assert.equal(manifest.version, 'senior-v1');
assert.equal(manifest.modules.length, 21);
const titles = new Map();
let total = 0;
for (const module of manifest.modules) {
  const rows = (await readFile(new URL(module.file, root), 'utf8')).trim().split(/\r?\n/);
  assert.equal(rows.length, 50, `${module.id}: expected exactly 50 questions`);
  for (const [i, row] of rows.entries()) {
    const fields = row.split('\t');
    assert.equal(fields.length, 2, `${module.id}:${i + 1}: expected title and answer`);
    const [title, answer] = fields;
    assert.ok(title.trim() && title.length <= 1000, `${module.id}:${i + 1}: invalid title`);
    assert.ok(answer.length >= 40, `${module.id}:${i + 1}: answer is too short (${answer.length})`);
    assert.ok(!titles.has(title), `${module.id}:${i + 1}: duplicate title from ${titles.get(title)}`);
    assert.ok(!/待补充|TODO|示例答案|自行查阅/.test(answer), `${module.id}:${i + 1}: placeholder answer`);
    titles.set(title, module.id);
    total++;
  }
  console.log(`${module.category}: 50 questions with answers`);
}
assert.equal(total, 1050);
console.log(`PASS: ${manifest.modules.length} modules, ${total} unique questions; minimum answer length 40 characters.`);
