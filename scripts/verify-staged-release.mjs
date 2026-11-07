import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(fileURLToPath(new URL('../release/',import.meta.url)));
const stage=path.resolve(process.argv[2]||'');
assert.ok(stage.startsWith(root+path.sep),'Staging folder must be inside this workspace release directory');
const manifest=JSON.parse(await readFile(path.join(stage,'build-manifest.json'),'utf8'));
assert.ok(Object.values(manifest.checks).every(Boolean),'Incomplete validation cannot be packaged');
async function stagedFiles(directory,prefix=''){
 const result=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  assert.ok(!entry.isSymbolicLink(),'Unexpected staged link: '+entry.name);
  const name=prefix+entry.name;
  if(entry.isDirectory())result.push(...await stagedFiles(path.join(directory,entry.name),name+'/'));
  else result.push(name);
 }
 return result.sort();
}
assert.deepEqual(await stagedFiles(stage),[...Object.keys(manifest.source),'build-manifest.json'].sort(),'Staged file set differs from the verified source');
for(const [name,expected] of Object.entries(manifest.source)){
 const file=path.resolve(stage,name);assert.ok(file.startsWith(stage+path.sep));
 const actual=createHash('sha256').update(await readFile(file)).digest('hex');assert.equal(actual,expected,'Staged source differs: '+name);
}
const jar=path.resolve(process.argv[3]);assert.ok(jar.startsWith(root+path.sep));
assert.equal(createHash('sha256').update(await readFile(jar)).digest('hex'),manifest.artifacts['backend/target/interview-site-1.0.0.jar'],'Copied JAR differs');
console.log('PASS: staged sources and copied JAR match the fully verified inputs.');
