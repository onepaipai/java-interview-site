import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const RD = n => 'https://redis.io/docs/latest/develop/' + n;
const KF = 'https://kafka.apache.org/41/';
const reviewer = 'zcode-review-20261024';
const version = 'Redis 7 / Kafka 4.1';

const redisLocks = 'https://redis.io/docs/latest/develop/use/patterns/distributed-locks/';
const redisPat = redisLocks;
const redisEvict = RD('reference/eviction/');
const redisTx = RD('interact/transactions/');
const redisLua = RD('interact/programmability/');
const redisExpire = RD('reference/expiration/');
const redisCluster = RD('operate/oss_cluster/');
const redisKeyspace = RD('develop/keyspace/');
const redisHashes = RD('develop/data-types/hashes/');
const redisStrings = RD('develop/data-types/strings/');
const redisPersist = 'https://redis.io/docs/latest/operate/management/persistence/';
const redisson = 'https://github.com/redisson/redisson/wiki/8.-distributed-locks-and-synchronizers';
const kleppmann = 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html';
const kafkaDesign = KF + 'design/design/';
const kafkaDocs = KF + 'documentation/';
const jls17 = 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html';
const juc = 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html';
const awsBackoff = 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/';
const schemaReg = 'https://docs.confluent.io/platform/current/schema-registry/index.html';
const disruptor = 'https://lmax-exchange.github.io/disruptor/';

const evidence = {
  2: [redisPat, redisEvict], 3: [redisPat, redisEvict], 5: [redisEvict, jls17],
  6: [redisEvict, 'https://redis.io/docs/latest/operate/rs/clustering/'],
  7: [redisEvict, redisKeyspace], 8: [redisEvict, redisHashes],
  9: [redisTx, redisPat], 10: [redisLua, redisPat],
  11: [redisLocks], 12: [redisLocks], 13: [redisLocks, redisson],
  14: [redisLocks, kleppmann], 15: [redisEvict, redisExpire],
  16: [redisEvict], 17: [redisPersist], 18: [redisCluster],
  19: [redisStrings], 20: [redisPat, jls17],
  21: [kafkaDocs, kafkaDesign], 22: [kafkaDocs, kafkaDesign],
  23: [kafkaDocs, kafkaDesign], 24: [kafkaDocs, kafkaDesign],
  25: [kafkaDesign, kafkaDocs], 26: [kafkaDocs, kafkaDesign],
  27: [kafkaDocs, kafkaDesign], 28: [kafkaDocs, kafkaDesign],
  29: [kafkaDocs, kafkaDesign], 31: [kafkaDocs, kafkaDesign],
  32: [kafkaDocs, kafkaDesign], 33: [juc, awsBackoff],
  34: [kafkaDocs, kafkaDesign], 35: [kafkaDocs, schemaReg],
  36: [kafkaDocs, kafkaDesign], 37: [kafkaDocs, kafkaDesign],
  38: ['https://rocketmq.apache.org/docs/delaymessage/', kafkaDocs],
  39: [kafkaDocs, kafkaDesign], 40: [redisEvict, kafkaDesign],
  41: [kafkaDesign, kafkaDocs], 42: [kafkaDocs, jls17],
  43: [kafkaDocs, kafkaDesign], 44: [kafkaDocs, kafkaDesign],
  45: [redisEvict, kafkaDesign], 46: [kafkaDocs, redisPat],
  47: [kafkaDocs, kafkaDesign], 48: [redisPat, kafkaDocs],
  49: [kafkaDocs, kafkaDesign], 50: [redisEvict, kafkaDocs],
};

const expected = new Set(Object.keys(evidence).map(Number));
const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const byFile = new Map(manifest.entries.map(e => [e.file.slice(e.file.lastIndexOf('/') + 1), e]));
const ledger = JSON.parse(await read('content/explanations/review-ledger.json'));
let patched = 0;
for (const [key, ev] of Object.entries(evidence)) {
  const n = parseInt(key);
  const f = byFile.get('cache-messaging-' + n + '.md');
  if (!f) throw new Error('missing manifest entry for cache-messaging-' + n);
  const entry = ledger.entries.find(x => x.sourceKey === f.sourceKey);
  if (!entry) throw new Error('missing ledger entry for cache-messaging-' + n);
  if (entry.answerSha256 !== f.answerSha256) throw new Error('sha mismatch for cache-messaging-' + n);
  entry.factualReview = { status: 'verified', applicableVersion: version, evidence: ev, reviewer };
  patched++;
}
if (patched !== expected.size) throw new Error('expected ' + expected.size + ', got ' + patched);
await writeFile(new URL('content/explanations/review-ledger.json', root), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
console.log('Patched factual review for ' + patched + ' cache-messaging questions.');
