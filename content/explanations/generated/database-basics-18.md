<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)

</details>

## 参考回答

1. 不是。InnoDB 一致性读可通过历史版本减少记录锁竞争，锁定读、写入、约束检查及其他元数据协调仍可能加锁。
2. 需说明语句与隔离级别，不能把普通快照 SELECT 的结论套到 FOR UPDATE、更新或全部 DDL。

## 参考分析

1. 多版本依赖 undo 和清理机制，长时间旧快照还会增加历史版本保留成本。
2. 非锁定读不等于零等待，IO、资源和元数据等仍可能影响执行。

## 案例

1. 教学场景：普通查询不阻塞写入，改为余额 FOR UPDATE 后另一个扣减开始等待。

2. 对照同一数据下普通读和锁定读，记录索引、隔离级别及等待资源。

3. 验证等待可由具体锁解释，不能因启用 MVCC 就忽略事务长度与超时。

## 总结点

1. 版本读减少部分锁竞争。
2. 写与锁定读仍需协调。
