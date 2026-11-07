import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { format } from '../frontend/node_modules/prettier/index.mjs';
const root=new URL('../',import.meta.url),keys=new Set();
const env=await readFile(new URL('.env.example',root),'utf8');
for(const [index,line] of env.split(/\r?\n/).entries()){
 if(!line.trim()||line.trimStart().startsWith('#'))continue;
 const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
 assert.ok(match,`.env.example line ${index+1}: expected one KEY=value per physical line`);
 assert.ok(!keys.has(match[1]),'Duplicate sample key: '+match[1]);keys.add(match[1]);
 assert.ok(!line.includes('\\n'),`.env.example line ${index+1}: literal newline escape`);
}
for(const key of ['ADMIN_PASSWORD','DB_PASSWORD','DB_ROOT_PASSWORD','COOKIE_SECURE','AI_ENABLED','AI_CHAT_TIMEOUT_MS','AI_EMBEDDING_TIMEOUT_MS','AI_REQUESTS_PER_HOUR','AI_MAX_OUTPUT_TOKENS','AI_MAX_INPUT_CHARACTERS','KNOWLEDGE_MAX_CHUNKS','KNOWLEDGE_MAX_VECTOR_BYTES'])assert.ok(keys.has(key),'Missing configuration: '+key);
for(const file of ['compose.yml','compose.test.yml','.github/workflows/verify.yml']){
 const source=await readFile(new URL(file,root),'utf8');await format(source,{parser:'yaml'});
 assert.ok(!/^ {6}[A-Z][A-Z0-9_]*:\s*(true|false)\s*$/m.test(source),file+': environment booleans must be quoted strings');
}
const compose=await readFile(new URL('compose.yml',root),'utf8');
assert.ok(/DB_URL:\s*jdbc:mysql:\/\//.test(compose),'compose.yml: DB_URL must point at MySQL (a missing DB_URL silently falls back to the local H2 file database)');
console.log('PASS: physical environment lines, budget keys, YAML syntax and environment value types. Docker semantic validation remains a separate required release gate.');
