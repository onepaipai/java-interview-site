import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const files=process.argv.slice(2);
assert.ok(files.length,'Usage: node scripts/prepare-audit-examples.mjs <audit-json> [...]');
const questions=JSON.parse(await readFile(new URL('../../content/explanations/question-overrides.json',import.meta.url),'utf8')).questions;
const cases=[];
for(const file of files){
 const audit=JSON.parse(await readFile(file,'utf8'));
 for(const item of audit.records.filter(x=>x.validation.kind==='java-output')){
  const code=questions[item.key].case.find(step=>step.code?.language==='java').code.source;
  assert.equal(createHash('sha256').update(code).digest('hex'),item.validation.codeSha256,item.key+': code changed after review');
  cases.push({key:item.key,code,expected:item.validation.expected});
 }
}
assert.equal(new Set(cases.map(x=>x.key)).size,cases.length,'Duplicate executable review');
const source=`import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
class AuditedCases {
 interface Work { void run() throws Exception; }
 static void check(String name,Work work,List<String> expected) throws Exception {
  var original=System.out;var bytes=new ByteArrayOutputStream();
  try(var capture=new PrintStream(bytes,true,StandardCharsets.UTF_8)) { System.setOut(capture);work.run(); }
  finally { System.setOut(original); }
  var actual=bytes.toString(StandardCharsets.UTF_8).lines().toList();
  if(!actual.equals(expected))throw new AssertionError(name+": "+actual+" != "+expected);
  System.out.println("PASS "+name+" "+actual);
 }
 ${cases.map((item,index)=>`static void case${index}() throws Exception {\n${item.code}\n}`).join('\n')}
 public static void main(String[] args)throws Exception {
 ${cases.map((item,index)=>`check(${JSON.stringify(item.key)},AuditedCases::case${index},List.of(${item.expected.map(x=>JSON.stringify(x)).join(',')}));`).join('\n')}
 System.out.println("PASS ${cases.length} reviewed Java cases");
 }
}
`;
const target=new URL('../../backend/target/',import.meta.url);await mkdir(target,{recursive:true});
await writeFile(new URL('AuditedCases.java',target),source);
console.log(`Prepared ${cases.length} reviewed cases in backend/target/AuditedCases.java`);
