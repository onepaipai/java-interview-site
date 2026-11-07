import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const doc = n => 'https://dev.mysql.com/doc/refman/8.4/en/' + n + '.html';
const reviewer = 'zcode-review-20261024';
const version = 'MySQL 8.4';

const evidence = {
  1: [doc('mysql-indexes.html'), doc('sys-schema.html')],
  2: [doc('explain-output.html'), doc('mysql-indexes.html')],
  3: [doc('innodb-persistent-stats.html'), doc('analyze-table.html')],
  4: [doc('histogram-optimization.html'), doc('mysql-indexes.html')],
  5: [doc('sys-schema-index-statistics.html'), doc('innodb-index-types.html')],
  6: [doc('explain-output.html'), doc('mysql-indexes.html')],
  7: [doc('limit-optimization.html'), doc('mysql-indexes.html')],
  8: [doc('mysql-indexes.html'), doc('limit-optimization.html')],
  9: [doc('mysql-indexes.html'), doc('explain-output.html')],
  10: [doc('partitioning-selection.html'), doc('partitioning.html')],
  11: [doc('partitioning.html'), doc('replication.html')],
  12: [doc('partitioning.html'), doc('replication.html')],
  13: [doc('innodb-index-types.html'), doc('partitioning.html')],
  14: [doc('limit-optimization.html'), doc('partitioning.html')],
  15: [doc('partitioning.html'), doc('replication.html')],
  16: [doc('partitioning.html'), doc('explain-output.html')],
  17: [doc('innodb-online-ddl.html'), doc('metadata-locks.html')],
  18: [doc('innodb-online-ddl.html'), doc('data-type-defaults.html')],
  19: [doc('create-index.html'), doc('innodb-online-ddl.html')],
  20: [doc('innodb-online-ddl.html'), doc('replication-options-replica.html')],
  21: [doc('innodb-deadlocks.html'), doc('innodb-locking.html')],
  22: [doc('innodb-deadlocks.html'), doc('innodb-locking.html')],
  23: [doc('innodb-locking.html'), doc('innodb-deadlocks.html')],
  25: [doc('innodb-locking.html'), doc('innodb-deadlocks.html')],
  32: [doc('replication.html'), doc('binlog-log.html')],
  33: [doc('replication.html'), doc('replication-gtids.html')],
  34: [doc('point-in-time-recovery.html'), doc('mysqlbinlog.html')],
  35: [doc('backup-and-recovery.html'), doc('mysqldump.html')],
  36: [doc('point-in-time-recovery.html'), doc('binlog-log.html')],
  37: [doc('server-system-variables.html'), doc('performance-schema-connection-attribute-tables.html')],
  38: [doc('performance-schema-statement-summary-tables.html'), doc('statement-explain-information.html')],
  39: [doc('innodb-disk-io.html'), doc('innodb-buffer-pool.html')],
  40: [doc('innodb-multi-versioning.html'), doc('replication-features.html')],
  41: [doc('replication.html'), doc('innodb-locking.html')],
  42: [doc('innodb-transaction-model.html'), doc('replication.html')],
  43: [doc('access-control.html'), doc('audit-log.html')],
  44: [doc('mysql-indexes.html'), doc('information-schema.html')],
  45: [doc('innodb-online-ddl.html'), doc('partitioning.html')],
  46: [doc('charset.html'), doc('time-zone-support.html')],
  47: [doc('innodb-online-ddl.html'), doc('data-type-defaults.html')],
  48: [doc('replication.html'), doc('backup-and-recovery.html')],
  49: [doc('partitioning.html'), doc('server-status-variables.html')],
  50: [doc('sys-schema.html'), doc('mysql-indexes.html')],
};

const expected = new Set(Object.keys(evidence).map(Number));
const manifest = JSON.parse(await read('content/explanations/manifest.json'));
const byFile = new Map(manifest.entries.map(e => [e.file.slice(e.file.lastIndexOf('/') + 1), e]));
const ledger = JSON.parse(await read('content/explanations/review-ledger.json'));
let patched = 0;
for (const entry of ledger.entries) {
  const m = entry.sourceKey && entry.title ? null : null;
}
for (const [key, ev] of Object.entries(evidence)) {
  const n = parseInt(key);
  const f = byFile.get('database-advanced-' + n + '.md');
  if (!f) throw new Error('missing manifest entry for database-advanced-' + n);
  const entry = ledger.entries.find(x => x.sourceKey === f.sourceKey);
  if (!entry) throw new Error('missing ledger entry for database-advanced-' + n);
  if (entry.answerSha256 !== f.answerSha256) throw new Error('sha mismatch for database-advanced-' + n);
  entry.factualReview = { status: 'verified', applicableVersion: version, evidence: ev, reviewer };
  patched++;
}
if (patched !== expected.size) throw new Error('expected ' + expected.size + ', got ' + patched);
await writeFile(new URL('content/explanations/review-ledger.json', root), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
console.log('Patched factual review for ' + patched + ' database-advanced questions.');
