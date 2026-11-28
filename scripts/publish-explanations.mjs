import { mkdir, mkdtemp, readFile, writeFile, rename, access, readdir, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const hash = text => createHash('sha256').update(text).digest('hex');

/** Publish complete immutable files first; a single rename makes the manifest visible. */
export async function publishExplanations(directory, version, artifacts) {
  assert.match(version,/^explanations-v[1-9][0-9]*$/);
  assert.ok(artifacts.length);
  const names=new Set(),keys=new Set();
  for (const {entry,content} of artifacts) {
    assert.match(entry.file,/^generated\/[a-z0-9-]+\.md$/);
    assert.ok(!names.has(entry.file) && !keys.has(entry.sourceKey),'Duplicate publication entry');
    names.add(entry.file);keys.add(entry.sourceKey);
    assert.equal(hash(content),entry.answerSha256,'Content digest mismatch');
  }
  const identity=hash(version+'\n'+JSON.stringify(artifacts.map(({entry})=>entry)));
  const publishedRoot=path.resolve(directory,'published');
  const destination=path.join(publishedRoot,identity);
  assert.ok(destination.startsWith(publishedRoot+path.sep));
  await mkdir(publishedRoot,{recursive:true});
  let exists=true;try{await access(destination);}catch(error){if(error.code!=='ENOENT')throw error;exists=false;}
  if (!exists) {
    const stage=await mkdtemp(path.join(publishedRoot,'.staging-'));
    assert.ok(path.resolve(stage).startsWith(publishedRoot+path.sep));
    for(const {entry,content} of artifacts) await writeFile(path.join(stage,path.basename(entry.file)),content,{encoding:'utf8',flag:'wx'});
    await rename(stage,destination);
  }
  // Never repair an existing snapshot silently: a bad snapshot must not affect an older manifest.
  for(const {entry,content} of artifacts)
    assert.equal(await readFile(path.join(destination,path.basename(entry.file)),'utf8'),content,'Immutable publication changed');
  const entries=artifacts.map(({entry})=>({...entry,file:`published/${identity}/${path.basename(entry.file)}`}));
  const manifest={version,count:entries.length,entries};
  const temp=path.resolve(directory,`.manifest-${randomUUID()}.tmp`);
  await writeFile(temp,JSON.stringify(manifest,null,2),{encoding:'utf8',flag:'wx'});
  await rename(temp,path.resolve(directory,'manifest.json'));
  // 发布成功后才清理快照：失败路径必须原样保留旧快照，供下一次发布做不可变校验。
  for (const name of await readdir(publishedRoot)) {
    if (name === path.basename(destination)) {
      continue;
    }
    await rm(path.join(publishedRoot, name), { recursive: true, force: true });
  }
  return manifest;
}
