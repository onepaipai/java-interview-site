import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=data=>createHash('sha256').update(data).digest('hex');
async function files(directory){const entries=[];for(const item of await readdir(path.join(root,directory),{withFileTypes:true})){const name=directory+'/'+item.name;if(item.isDirectory())entries.push(...await files(name));else if(item.isFile())entries.push(name);}return entries.sort();}
async function tree(names){const result={};for(const name of names.sort())result[name]=hash(await readFile(path.join(root,name)));return result;}
const directories=['backend/src','frontend/src','frontend/public','frontend/tests','content','deploy','docs','scripts','.github'];
const roots=['compose.yml','compose.test.yml','.env.example','.gitignore','.dockerignore','.prettierrc.json','.prettierignore','backend/pom.xml','backend/Dockerfile','backend/.dockerignore','frontend/package.json','frontend/package-lock.json','frontend/index.html','frontend/tsconfig.json','frontend/vite.config.ts','frontend/Dockerfile','frontend/nginx.conf','frontend/.dockerignore'];
const inputs=[...roots];for(const directory of directories)inputs.push(...await files(directory));
const source=await tree(inputs);
const artifacts=await tree(['backend/target/interview-site-1.0.0.jar',...await files('frontend/dist')]);
const actual={sourceSha256:hash(JSON.stringify(source)),source,artifacts};
const target=path.join(root,'backend/target/verification.json');
if(process.argv.includes('--record')){
 const mysql=process.argv.includes('--mysql=passed'),e2e=process.argv.includes('--e2e=passed');
 await writeFile(target,JSON.stringify({version:1,verifiedAt:new Date().toISOString(),checks:{backend:true,frontend:true,format:true,contract:true,content:true,mysql,e2e},...actual},null,2)+'\n');
 console.log(`Recorded validation ${actual.sourceSha256}; MySQL=${mysql}; E2E=${e2e}.`);
}else{
 const expected=JSON.parse(await readFile(target,'utf8'));
 assert.deepEqual(expected.source,actual.source,'Source changed after verification; rerun scripts/verify.ps1');
 assert.deepEqual(expected.artifacts,actual.artifacts,'Artifacts changed after verification');
 if(!process.argv.includes('--diagnostic'))assert.ok(Object.values(expected.checks).every(Boolean),'A release requires all gates, including MySQL and E2E');
 console.log('PASS: source and artifact hashes match the recorded validation.');
}
