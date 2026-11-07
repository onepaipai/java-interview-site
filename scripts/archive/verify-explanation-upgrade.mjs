import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const directory = process.argv[2];
assert.ok(directory, 'Usage: node scripts/verify-explanation-upgrade.mjs <snapshot-directory>');
const read = async name => JSON.parse((await readFile(path.join(directory,name),'utf8')).replace(/^\uFEFF/,''));
const before = await read('questions-before.json'), after = await read('questions-after.json');
// Optional explicit counts for a release applied in multiple reviewed stages.
const versionIncrements = process.argv[3] ? await read(process.argv[3]) : {};
const manifest = JSON.parse(await readFile(new URL('../../content/explanations/manifest.json',import.meta.url),'utf8'));
const catalog = new Map(manifest.entries.map(entry => [entry.sourceKey,entry]));
let previous = new Map();
try { previous=new Map((await read('manifest-before.json')).entries.map(entry=>[entry.sourceKey,entry])); }
catch(error){if(error.code!=='ENOENT')throw error;}
const byId = new Map(after.map(row => [row.id,row]));
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(after.length,before.length,'Record count changed');
assert.equal(byId.size,before.length,'Duplicate IDs');
const report = { records:before.length,active:0,archivedUnchanged:0,upgraded:0,alreadyCurrent:0,emptyAnswersFilled:0,customRetained:0,manualRetained:0,conflicts:0 };
for (const old of before) {
  const actual = byId.get(old.id); assert.ok(actual,'Missing ID '+old.id);
  if (!old.deleted) report.active++;
  const entry = catalog.get(old.source_key);
  const oldHash=hash(old.answer);
  const published=previous.get(old.source_key);
  const eligible = !old.deleted && entry && old.title===entry.title &&
    (oldHash===entry.baselineAnswerSha256 || published?.title===old.title && oldHash===published.answerSha256);
  if(!old.deleted&&entry&&old.title===entry.title&&oldHash===entry.answerSha256){
    assert.deepEqual(actual,old,'Already current record changed: '+old.id);report.alreadyCurrent++;continue;
  }
  if (eligible) {
    assert.equal(hash(actual.answer),entry.answerSha256,'Wrong published answer '+old.id);
    const increment=versionIncrements[old.id] ?? 1;
    assert.ok(Number.isSafeInteger(increment)&&increment>=1,'Invalid expected version increment '+old.id);
    assert.equal(actual.version,old.version+increment,'Wrong version increment '+old.id);
    for (const field of Object.keys(old).filter(key => !['answer','version','updated_at'].includes(key)))
      assert.deepEqual(actual[field],old[field],`Unintended change to ${field} on ${old.id}`);
    report.upgraded++; if (!old.answer.trim()) report.emptyAnswersFilled++;
  } else {
    assert.deepEqual(actual,old,'Preserved record changed: '+old.id);
    if (old.deleted) report.archivedUnchanged++; else if (!entry) report.customRetained++; else report.manualRetained++;
  }
}
for (const kind of ['categories','tags']) assert.deepEqual(await read(kind+'-after.json'),await read(kind+'-before.json'),kind+' changed');
assert.equal(report.upgraded+report.alreadyCurrent+report.manualRetained+report.conflicts,before.filter(row=>!row.deleted&&catalog.has(row.source_key)).length,'Catalog audit coverage mismatch');
assert.equal(after.filter(row=>!row.deleted&&!row.answer.trim()).length,0,'Active answers are still empty');
try {
  await access(path.join(directory,'questions-after-restart.json'));
  assert.deepEqual(await read('questions-after-restart.json'),after,'Restart mutated questions');
  for (const kind of ['categories','tags']) assert.deepEqual(await read(kind+'-after-restart.json'),await read(kind+'-after.json'));
  report.restartNoChanges=true;
} catch(error) { if (error.code!=='ENOENT') throw error; }
await writeFile(path.join(directory,'upgrade-audit.json'),JSON.stringify(report,null,2));
console.log('PASS: '+JSON.stringify(report));
