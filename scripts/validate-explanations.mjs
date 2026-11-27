import {readFile,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateQuestionContent,renderQuestionContent} from './explanation-content.mjs';
import {validateExplanationMarkdown} from './explanation-markdown.mjs';
import {loadQuestionContents} from './question-contents.mjs';
const root=new URL('../content/explanations/',import.meta.url);
const publicRoot=new URL('../frontend/public/',import.meta.url);
const read=async file=>readFile(new URL(file,root),'utf8');
const manifest=JSON.parse(await read('manifest.json'));
assert.equal(manifest.count,1227);assert.equal(manifest.entries.length,1227);
assert.equal(new Set(manifest.entries.map(entry=>entry.sourceKey)).size,1227);
assert.deepEqual((await readdir(new URL('generated/',root))).filter(name=>name.endsWith('.md')).sort(),manifest.entries.map(entry=>entry.file.split('/').at(-1)).sort());
const corrections=await loadQuestionContents();
for(const [key,content] of Object.entries(corrections.questions)){
  const entry=manifest.entries.find(item=>item.file.endsWith('/'+key.replaceAll('/','-')+'.md'));
  assert.ok(entry,key+': unknown correction');validateQuestionContent(content,key,entry.title);
  const actual=await read(entry.file);
  assert.equal(actual.slice(actual.indexOf('## 参考回答')),renderQuestionContent(content),key+': correction overwritten');
}
let diagrams=0;
for(const entry of [...manifest.entries,...(await readdir(new URL('samples/',root))).filter(name=>name.endsWith('.md')).map(name=>({file:'samples/'+name}))]){
  const source=await read(entry.file);
  if(entry.answerSha256){
    assert.equal(createHash('sha256').update(source).digest('hex'),entry.answerSha256,entry.file+': digest mismatch');
    assert.equal(await read('generated/'+entry.file.split('/').at(-1)),source,entry.file+': review copy differs from published content');
  }
  const body=entry.file.startsWith('samples/')?source.slice(source.indexOf('## 参考回答')):source;
  for(const image of validateExplanationMarkdown(body,entry.file)){diagrams++;await access(new URL(image.slice(1),publicRoot));}
}
const coverage=JSON.parse(await read('coverage.json'));
assert.equal(coverage.unmatched.length,0);
assert.equal(coverage.qualityReview.questionSpecific,Object.keys(corrections.questions).length);
console.log(`PASS: ${manifest.count} explanations + 3 samples; structure, hashes, ${diagrams} diagrams and ${Object.keys(corrections.questions).length} question-specific corrections. This is not a full factual review.`);
