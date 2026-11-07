import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';

const directory = process.argv[2];
assert.ok(directory, 'Usage: node scripts/verify-review-fixes.mjs <snapshot-directory>');
const read = async name => JSON.parse((await readFile(path.join(directory, name), 'utf8')).replace(/^\uFEFF/, ''));
const before = await read('questions-before.json'), after = await read('questions-after.json');
const fixes = JSON.parse(await readFile(new URL('../../content/explanations/review-fixes-20261020.json', import.meta.url), 'utf8')).changes;
const byId = new Map(before.map(row => [row.id, row]));
const changed = after.filter(row => row.answer !== byId.get(row.id)?.answer);
assert.equal(fixes.length, 46);
assert.deepEqual(changed.map(row => row.source_key).sort(), fixes.map(row => row.sourceKey).sort(), 'Actual answer changes differ from the reviewed list');
for (const fix of fixes) {
  const row = changed.find(item => item.source_key === fix.sourceKey);
  assert.equal(row.title, fix.title);
  assert.equal(createHash('sha256').update(row.answer).digest('hex'), fix.answerSha256);
}
console.log(`PASS: exactly ${fixes.length} reviewed answers published, titles and hashes match; no unlisted answer changed.`);
