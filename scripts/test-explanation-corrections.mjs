import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { validateQuestionContent, renderQuestionContent } from './explanation-content.mjs';
import {loadQuestionContents} from './question-contents.mjs';

const root = new URL('../content/explanations/', import.meta.url);
const { questions } = await loadQuestionContents();
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const reference = questions['java-language/18'];
const reject = change => {
  const candidate = clone(reference);
  change(candidate);
  assert.throws(() => validateQuestionContent(candidate, 'java-language/18', reference.title));
};

reject(value => value.title = '另一个题目');
reject(value => delete value.answer);
reject(value => value.analysis = []);
const concise = clone(reference);
delete concise.analysis;
validateQuestionContent(concise, 'java-language/18', reference.title);
assert.doesNotMatch(renderQuestionContent(concise), /## 参考分析/);
reject(value => value.summary = ['长'.repeat(23), '第二点']);
reject(value => value.case = [{ text: '只有背景' }, { text: '只有处理' }]);
reject(value => value.case[1].code.source = '```java\nnot a code body');
reject(value => value.references = ['javascript:alert(1)']);

for (const [key, value] of Object.entries(questions)) {
  const entry = manifest.entries.find(item => item.file.endsWith('/' + key.replaceAll('/', '-') + '.md'));
  assert.ok(entry, 'Missing correction: ' + key);
  validateQuestionContent(value, key, entry.title);
  const generated = await readFile(new URL(entry.file, root), 'utf8');
  assert.equal(generated.slice(generated.indexOf('## 参考回答')), renderQuestionContent(value), key + ': overwritten by a shared topic');
}

const body = key => renderQuestionContent(questions[key]);
assert.doesNotMatch(body('java-language/18'), /重复键|订单聚合|终止操作/);
assert.match(body('java-language/18'), /编译失败/);
for (const phase of ['BEFORE_COMMIT', 'AFTER_COMMIT', 'AFTER_ROLLBACK', 'AFTER_COMPLETION', 'fallbackExecution'])
  assert.ok(body('spring-advanced/9').includes(phase));
assert.match(body('algorithms/2'), /都为频次 1.*淘汰.*A/);
assert.match(body('algorithms/2'), /minFreq/);
assert.doesNotMatch(body('legacy/93'), /超级大户|LIMIT|统计信息/);
assert.match(body('legacy/95'), /RR:100，RC:200/);
assert.doesNotMatch(body('network/1'), /设计长度或分隔协议|字节流自行定界/);
assert.doesNotMatch(body('legacy/112'), /最小栈|连续 pop|双队列/);
assert.match(body('legacy/112'), /Singleton/);
assert.doesNotMatch(body('legacy/64'), /限时可重入锁|对比公平/);
assert.doesNotMatch(body('jvm-advanced/4'), /暂停目标不是承诺/);
assert.doesNotMatch(body('ai-basics/12'), /rag-evidence\.svg|topK|重排/);

const stockCode = questions['database-advanced/26'].case.find(step => step.code)?.code.source;
assert.ok(stockCode.indexOf('INSERT INTO stock_deduction') < stockCode.indexOf('UPDATE stock'));
assert.match(body('database-advanced/26'), /事务内先插/);
assert.match(body('database-advanced/26'), /一起回滚/);
const stockSample = await readFile(new URL('samples/database-advanced-026.md', root), 'utf8');
assert.equal(stockSample.slice(stockSample.indexOf('## 参考回答')), renderQuestionContent(questions['database-advanced/26']));

// Check the arithmetic used by the teaching examples, independent of their prose.
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const normalize = vector => vector.map(value => value / Math.hypot(...vector));
assert.equal(distance([1, 0], [10, 0]), 9);
assert.equal(distance([1, 0], [1, 1]), 1);
assert.ok(Math.abs(distance([1, 0], normalize([1, 1])) ** 2 - (2 - Math.SQRT2)) < 1e-12);
assert.equal(8 + 15 + 25 + 400 + 12, 460);
for(const module of ['network','banking','algorithms'])
  for(let number=1;number<=50;number++) assert.ok(questions[module+'/'+number],module+'/'+number+': missing focused answer');
assert.doesNotMatch(body('network/4'),/DNS|切流|空闲连接/);
assert.match(body('network/4'),/长度前缀|半帧/);
assert.doesNotMatch(body('banking/20'),/并发|余额|死锁/);
assert.match(body('banking/20'),/0\.03.*0\.02/);
assert.doesNotMatch(body('algorithms/42'),/编辑距离|LCS|零钱/);
assert.match(body('reliability/4'),/100ms.*50\.5ms/);
assert.doesNotMatch(body('collections/2'),/树化|容量与空间一起算/);
assert.match(body('collections/2'),/merge|compute/);
assert.doesNotMatch(body('collections/25'),/设定有界容量/);
assert.match(body('collections/25'),/FutureTask/);
assert.doesNotMatch(body('concurrency-advanced/35'),/StampedLock|乐观读/);
assert.match(body('concurrency-advanced/35'),/唯一消费者|同键同时只允许一个消费者/);
assert.doesNotMatch(body('database-basics/35'),/MyBatis|TRUNCATE/);
assert.match(body('database-basics/35'),/IS NULL/);
assert.match(body('distributed/5'),/本任期|任期 4/);
assert.match(body('concurrency-advanced/12'),/volatile boolean ready/);
assert.doesNotMatch(body('collections/6'),/compare 为零|createdAt/);
assert.match(body('collections/6'),/removeEldestEntry/);
assert.match(body('collections/18'),/null-key rejected/);
assert.match(body('collections/19'),/CyclicBarrier/);
for(const key of ['collections/6','collections/15','collections/18','collections/41'])
  assert.equal(questions[key].analysis,undefined,key+': off-topic shared analysis returned');
for(const key of ['java-language/3','network/12','algorithms/35']) assert.equal(questions[key].analysis,undefined,key+': duplicate analysis returned');
const reviewedFixes=JSON.parse(await readFile(new URL('../content/explanations/review-fixes-20261020.json',import.meta.url),'utf8'));
for(const fix of reviewedFixes.changes) assert.equal(questions[fix.key]?.title,fix.title,fix.key+': lost reviewed correction');
console.log(`PASS: ${Object.keys(questions).length} question-specific outputs, invalid mapping/partial-content guards, known semantic regressions and example arithmetic.`);
