import { readFile, writeFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Contract source. The JSON artifact is generated deterministically and checked in CI.
const root = new URL('../', import.meta.url);
const ref = name => ({ $ref: '#/components/schemas/' + name });
const string = (maxLength) => ({ type: 'string', ...(maxLength ? { maxLength } : {}) });
const integer = { type: 'integer', format: 'int64' };
const boolean = { type: 'boolean' };
const array = items => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const schemas = {
  Error: object({ code: string(), message: string() }),
  Id: object({ id: integer }),
  Category: object({ id: integer, name: string(200), sort_order: integer, deleted: boolean, archived_name: { type: ['string', 'null'] }, question_count: integer }),
  Tag: object({ id: integer, name: string(80) }),
  Name: object({ name: { ...string(200), minLength: 1 }, sortOrder: integer }, ['name']),
  TagName: object({ name: { ...string(80), minLength: 1 }, sortOrder: integer }, ['name']),
  Document: object({ title: { ...string(200), minLength: 1 }, content: string(2000000) }),
  KnowledgeDocument: object({ title: { ...string(200), minLength: 1 }, content: { ...string(500000), minLength: 1 } }),
  Edit: object({ title: { ...string(1000), minLength: 1 }, categoryId: integer, difficulty: { enum: ['基础', '进阶', '高级', '专家'] }, answer: string(200000), sortOrder: integer, tags: { ...array({ ...string(80), minLength: 1 }), maxItems: 20 }, version: { type: ['integer', 'null'] } }, ['title', 'categoryId', 'difficulty', 'answer', 'tags']),
  Position: object({ questionId: integer }),
  Password: object({ oldPassword: { ...string(), minLength: 1 }, newPassword: { ...string(64), minLength: 12, description: 'UTF-8 encoding must also fit BCrypt’s 72-byte limit.' } }),
  Account: object({ username: { ...string(40), pattern: '^[a-zA-Z0-9_-]{3,40}$' }, password: { ...string(64), minLength: 12 } }),
  Rename: object({ username: { ...string(40), pattern: '^[a-zA-Z0-9_-]{3,40}$' } }),
  ResetPassword: object({ password: { ...string(64), minLength: 12 } }),
  Progress: object({ mastery: { enum: ['NEW', 'NO', 'PARTIAL', 'YES'] }, favorite: boolean, note: string(30000), reviewed: boolean }, ['mastery', 'note']),
  Ask: object({ prompt: { ...string(3000), minLength: 1 }, history: { ...array(ref('Turn')), maxItems: 8 }, rag: boolean }, ['prompt', 'history']),
  Turn: object({ role: { enum: ['user', 'assistant'] }, content: string(8000) }),
  Source: object({ id: integer, key: string(), title: string(), questionId: { type: ['integer', 'null'] }, chunk: integer, content: string(), score: { type: 'number' } }),
  AiAnswer: object({ answer: string(), sources: array(ref('Source')), model: string(), rag: boolean }),
  KnowledgeStatus: object({ enabled: boolean, model: string(), embeddingConfigured: boolean, chunks: integer, vectors: integer, documents: integer }),
  User: object({ id: integer, username: string(), role: { enum: ['ADMIN', 'USER'] }, last_question: { type: ['integer', 'null'] } }),
  AccountSummary: object({ id: integer, username: string(), role: string(), created_at: string() }),
  Summary: object({ id: integer, title: string(), category_id: integer, category: string(), difficulty: string(), sort_order: integer, version: integer, answered: boolean, preview: string(), tags: array(string()), mastery: string(), favorite: boolean }),
  Detail: object({ id: integer, title: string(), category_id: integer, category: string(), difficulty: string(), answer: string(), sort_order: integer, version: integer, tags: array(string()), mastery: string(), favorite: boolean, note: string(), review_count: integer }),
  Page: object({ items: array(ref('Summary')), total: integer, page: integer, size: integer }),
  Location: object({ page: integer, index: integer, total: integer }),
  Csrf: object({ token: string(), headerName: string() }),
  Health: object({ status: { const: 'UP' } }),
  ImportItem: object({ sourceKey: { ...string(64), pattern: '^[a-f0-9]{64}$' }, title: string(1000), category: string(200), difficulty: string(), answer: string(200000), sortOrder: integer, tags: array(string(80)) }),
  Import: object({ questions: { ...array(ref('ImportItem')), maxItems: 5000 }, documents: { ...array(ref('Document')), maxItems: 1000 }, mode: { enum: ['skip', 'update'] } }),
  Preview: object({ questions: array(ref('ImportItem')), documents: array(ref('Document')), warnings: array(string()) }),
  ImportResult: object({ added: integer, updated: integer, skipped: integer }),
  SourceDetail: object({ key: string(), title: string(), questionId: { type: ['integer', 'null'] }, content: string() }),
  KnowledgeFile: object({ id: integer, title: string(), characters: integer, created_at: string() }),
  LibrarySource: object({ key: string(), title: string(), kind: { enum: ['question', 'reference', 'upload'] }, questionId: { type: ['integer', 'null'] }, chunks: integer }),
  Library: object({ items: array(ref('LibrarySource')), total: integer, page: integer, size: integer, counts: object({ question: integer, reference: integer, upload: integer }) }),
  IndexResult: object({ indexed: integer, remaining: integer }),
  Metrics: object({ mode: { const: 'single-instance' }, availableAiSlots: integer, counters: { type: 'object', additionalProperties: integer } }),
  BulkMove: object({ ids: { ...array(integer), minItems: 1, maxItems: 1000, uniqueItems: true }, categoryId: integer }),
  BulkMoveResult: object({ moved: integer, skipped: integer }),
  Backup: object({ version: integer, exportedAt: string(), scope: string(), categories: array({ type: 'object' }), archivedCategories: array({ type: 'object' }), tags: array({ type: 'object' }), documents: array({ type: 'object' }), questions: array({ type: 'object' }), trash: array({ type: 'object' }), publications: { type: 'object' } }),
  Review: object({ status: { enum: ['pending', 'verified', 'rejected', 'stale'] }, applicableVersion: string(200), evidence: array(string()), reviewer: string(80) }, ['status']),
  ReviewSummary: object({ counts: object({ pending: integer, verified: integer, rejected: integer, stale: integer }), items: array({ type: 'object' }) }),
};
const query = (name, schema, required = false) => ({ name, in: 'query', required, schema });
const operations = {
  'GET /api/health': ['Liveness and database connectivity', 'Health'],
  'GET /api/csrf': ['Create or refresh the CSRF token; retain the matching session cookie', 'Csrf'],
  'GET /api/me': ['Current account', 'User'],
  'PUT /api/me/position': ['Record reading position', null, 'Position'],
  'PUT /api/me/password': ['Change password and revoke other sessions', null, 'Password'],
  'GET /api/admin/accounts': ['List accounts without password hashes', array(ref('AccountSummary'))],
  'POST /api/admin/accounts': ['Create ordinary account', null, 'Account'],
  'PUT /api/admin/accounts/{id}': ['Rename ordinary account and revoke its sessions', null, 'Rename'],
  'PUT /api/admin/accounts/{id}/password': ['Reset ordinary account password and revoke its sessions', null, 'ResetPassword'],
  'DELETE /api/admin/accounts/{id}': ['Delete ordinary account and its progress; revoke sessions'],
  'GET /api/questions': ['Paged summaries; full answers and private notes are excluded', 'Page'],
  'GET /api/questions/{id}': ['Question detail with only the current user’s progress', 'Detail'],
  'GET /api/questions/{id}/location': ['Locate question using the same relevance and module ordering as the list', 'Location'],
  'POST /api/admin/questions': ['Create question', 'Id', 'Edit'],
  'PUT /api/admin/questions/{id}': ['Update active question with optimistic version; stale/deleted targets return 409', 'Id', 'Edit'],
  'DELETE /api/admin/questions/{id}': ['Soft-delete active question; missing target returns 404'],
  'POST /api/admin/questions/{id}/restore': ['Restore archived question; archived module returns 409'],
  'GET /api/categories': ['List active modules', array(ref('Category'))],
  'GET /api/admin/categories/archived': ['List archived modules with name and question count', array({ type: 'object' })],
  'POST /api/admin/categories/{id}/unarchive': ['Restore archived module under its original name; name conflict returns 409'],
  'POST /api/admin/categories': ['Create module', 'Id', 'Name'],
  'PUT /api/admin/categories/{id}': ['Rename/reorder active module; missing target returns 404', null, 'Name'],
  'DELETE /api/admin/categories/{id}': ['Archive empty module; nonempty module returns 409'],
  'GET /api/tags': ['List tags', array(ref('Tag'))],
  'POST /api/admin/tags': ['Create tag', null, 'TagName'],
  'PUT /api/admin/tags/{id}': ['Rename tag; missing target returns 404', null, 'TagName'],
  'DELETE /api/admin/tags/{id}': ['Idempotently remove tag and associations'],
  'GET /api/documents': ['List legacy reference document identities', array(object({ id: integer, title: string() }))],
  'GET /api/documents/{id}': ['Read reference document; missing target returns 404', object({ id: integer, title: string(), content: string() })],
  'POST /api/admin/documents': ['Create reference document', 'Id', 'Document'],
  'PUT /api/admin/documents/{id}': ['Update reference document; missing target returns 404', null, 'Document'],
  'DELETE /api/admin/documents/{id}': ['Idempotently remove reference document'],
  'GET /api/admin/export/documents': ['Export legacy reference documents', array({ type: 'object' })],
  'GET /api/admin/export': ['Export active questions as Markdown', { type: 'string' }],
  'PUT /api/questions/{id}/progress': ['Update only current account’s progress', null, 'Progress'],
  'GET /api/stats': ['Current account’s learning statistics', { type: 'object' }],
  'GET /api/me/export': ['Export only current account’s learning records', array({ type: 'object' })],
  'POST /api/admin/uploads': ['Upload PNG/JPEG/GIF ≤10,000,000 bytes and 20,000,000 pixels; re-encoded to PNG', object({ url: string() }), 'file'],
  'GET /uploads/{name}': ['Authenticated uploaded PNG', { type: 'string', format: 'binary' }],
  'POST /api/admin/import/preview': ['Preview UTF-8 Markdown ≤2,000,000 bytes without writing', 'Preview', 'file'],
  'POST /api/admin/import/commit': ['Atomically import reviewed items', 'ImportResult', 'Import'],
  'GET /api/ai/status': ['Model availability and knowledge counts; does not call model provider', 'KnowledgeStatus'],
  'GET /api/ai/search': ['Keyword-only retrieval; does not call model provider', array(ref('Source'))],
  'POST /api/questions/{id}/ai': ['Generate answer; one request/account, two globally, configurable hourly and input/output budgets', 'AiAnswer', 'Ask'],
  'GET /api/admin/knowledge': ['List uploaded documents', array(ref('KnowledgeFile'))],
  'POST /api/admin/knowledge': ['Add document within count and capacity budgets', 'Id', 'KnowledgeDocument'],
  'POST /api/admin/knowledge/upload': ['Upload UTF-8 Markdown/TXT ≤1,500,000 bytes', 'Id', 'file'],
  'DELETE /api/admin/knowledge/{id}': ['Remove uploaded document and invalidate retrieval'],
  'GET /api/admin/knowledge/sources': ['Browse eligible grouped sources', 'Library'],
  'GET /api/admin/knowledge/source': ['Read eligible original source; archived sources return 404', 'SourceDetail'],
  'POST /api/admin/knowledge/index': ['Build at most 16 embeddings; provider call is billable', 'IndexResult'],
  'GET /api/admin/metrics': ['Single-instance aggregate counters; excludes prompts, keys and account identifiers', 'Metrics'],
  'GET /api/admin/snapshot/questions': ['Admin-only paged full records for backup/content audits; includes source keys and only the current administrator’s progress', { type: 'object' }],
  'GET /api/admin/publications/status': ['Read-only human-edit reconciliation against publication hashes', { type: 'object' }],
  'POST /api/admin/questions/batch-move': ['Atomically move active questions to another module', 'BulkMoveResult', 'BulkMove'],
  'GET /api/admin/backup': ['Export a full JSON backup; progress is limited to the current administrator', 'Backup'],
  'GET /api/admin/reviews': ['List business-database review conclusions grouped by status', 'ReviewSummary'],
  'PUT /api/admin/reviews/{sourceKey}': ['Write one review conclusion; verified requires version, reviewer and evidence', { type: 'object' }, 'Review'],
  'GET /api/test-environment': ['Disposable E2E marker; disabled in normal deployments', object({ id: string() })],
};

export function contract() {
  const paths = {};
  for (const [key, [summary, output, input]] of Object.entries(operations)) {
    const [method, path] = key.split(' '), lower = method.toLowerCase();
    const operation = { summary, operationId: method.toLowerCase() + path.replace(/[^a-zA-Z0-9]+/g, '_'), tags: [path.includes('/admin/') ? 'Administration' : path.includes('/ai') ? 'AI' : 'Reader'], security: method === 'GET' ? [{ session: [] }] : [{ session: [], csrf: [] }], responses: { '200': { description: output ? 'Success' : 'Success with empty body', ...(output ? { content: { [path.endsWith('/export') ? 'text/markdown' : path.startsWith('/uploads/') ? 'image/png' : 'application/json']: { schema: typeof output === 'string' ? ref(output) : output } } } : {}) } } };
    if (['/api/health', '/api/csrf', '/api/test-environment'].includes(path)) operation.security = [];
    for (const status of [400, 401, 403, 404, 409, 413, 429, 502, 503, 504]) operation.responses[status] = { description: ({400:'Invalid input',401:'Authentication required',403:'Role or CSRF denied',404:'Not found',409:'Conflict',413:'Upload too large',429:'Quota or concurrency exhausted',502:'Invalid/upstream provider error',503:'Service unavailable',504:'Provider deadline exceeded'})[status], content: { 'application/json': { schema: ref('Error') } } };
    const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({ name, in: 'path', required: true, schema: name === 'id' ? integer : string() }));
    if (path === '/api/questions') parameters.push(query('search', { ...string(3000), default: '' }), query('category', integer), ...['difficulty','mastery','tag'].map(name => query(name, string())), ...['favorite','weak','trash'].map(name => query(name, { ...boolean, default: false })), query('page', { type: 'integer', minimum: 1, maximum: 100000, default: 1 }), query('size', { type: 'integer', minimum: 1, maximum: 100, default: 30 }));
    if (path.endsWith('/location')) parameters.push(query('search', string(3000)), query('category', integer), query('global', boolean), query('size', { type: 'integer', minimum: 1, maximum: 100, default: 30 }));
    if (path === '/api/ai/search') parameters.push(query('query', { ...string(3000), minLength: 1 }, true));
    if (path === '/api/admin/knowledge/source') parameters.push(query('key', { ...string(), pattern: '^(question|seed|upload):[1-9][0-9]*$' }, true));
    if (path.endsWith('/knowledge/sources')) parameters.push(query('kind', { enum: ['all','question','reference','upload'], default: 'all' }), query('query', string(200)), query('page', { type: 'integer', minimum: 1, maximum: 100000, default: 1 }), query('size', { type: 'integer', minimum: 1, maximum: 50, default: 12 }));
    if (parameters.length) operation.parameters = parameters;
    if (input) operation.requestBody = { required: true, content: { [input === 'file' ? 'multipart/form-data' : 'application/json']: { schema: input === 'file' ? object({ file: { type: 'string', format: 'binary' } }) : ref(input) } } };
    if (method === 'PUT' && path === '/api/admin/questions/{id}') operation.description = 'version is required for updates. A 409 preserves the client draft; reload before retrying. Do not automatically retry writes after a network timeout.';
    paths[path] ??= {}; paths[path][lower] = operation;
  }
  paths['/api/login'] = { post: { summary: 'Form login; first GET /api/csrf and retain its cookie/token pair', operationId: 'login', security: [{ csrf: [] }], requestBody: { required: true, content: { 'application/x-www-form-urlencoded': { schema: object({ username: string(), password: string() }) } } }, responses: { '200': { description: 'Authenticated; refresh CSRF token after login' }, '401': { description: 'Wrong credentials' }, '403': { description: 'Invalid CSRF token' }, '429': { description: 'Proxy login rate limit' } } } };
  paths['/api/logout'] = { post: { summary: 'Invalidate current login session', operationId: 'logout', security: [{ session: [], csrf: [] }], responses: { '204': { description: 'Logged out' }, '403': { description: 'Invalid CSRF token' } } } };
  return { openapi: '3.1.0', info: { title: '知序 API', version: '1.1.0', description: 'Cookie/session authentication with CSRF protection. ADMIN is required for /api/admin/**. USER may read and ask AI. Single backend instance. GET /api/questions returns summaries; load full answers through /api/questions/{id}. Legacy learning/import endpoints remain supported. Never point write tests at a business database.' }, servers: [{ url: 'http://127.0.0.1:8080', description: 'Local development; replace with the HTTPS origin for deployment' }], paths, components: { securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: 'JSESSIONID' }, csrf: { type: 'apiKey', in: 'header', name: 'X-CSRF-TOKEN', description: 'Use the headerName/token returned by GET /api/csrf and the matching cookie.' } }, schemas } };
}

async function sources(directory) { const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);if(entry.isDirectory())result.push(...await sources(url));else if(entry.name.endsWith('Controller.java'))result.push(url);}return result; }
export async function verifyContract() {
  const expected=contract(), actual=JSON.parse(await readFile(new URL('docs/openapi.json',root),'utf8'));
  assert.deepEqual(actual,expected,'Run node scripts/api-contract.mjs --write');
  const declared=new Set();
  for(const file of await sources(new URL('backend/src/main/java/',root))){
    const text=await readFile(file,'utf8');const prefix=text.match(/@RequestMapping\("([^"]+)"\)/)?.[1]||'';
    for(const match of text.matchAll(/@(Get|Post|Put|Delete)Mapping\(\s*(?:value\s*=\s*)?"([^"]+)"/g))declared.add(match[1].toUpperCase()+' '+prefix+match[2]);
  }
  for(const key of declared)assert.ok(operations[key], 'Undocumented endpoint: '+key);
  for(const key of Object.keys(operations))assert.ok(declared.has(key),'Stale endpoint: '+key);
  console.log(`PASS: ${declared.size+2} operations and explicit summary/detail, auth, CSRF, validation and error contracts.`);
}
if(process.argv.includes('--write'))await writeFile(new URL('docs/openapi.json',root),JSON.stringify(contract(),null,2)+'\n');
