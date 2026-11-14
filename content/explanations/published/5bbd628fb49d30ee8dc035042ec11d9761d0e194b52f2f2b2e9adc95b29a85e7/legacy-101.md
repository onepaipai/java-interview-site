<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

1. 按最新死锁日志重建事务、索引和锁等待环。
2. 统一访问顺序、缩短事务、补合适索引，但不能承诺完全无死锁。
3. 死锁失败后有界重试整笔幂等事务，记录重试率与用户影响。

## 参考分析

1. 统一顺序减少环路，但二级索引、外键及不同路径仍能形成竞争。
2. 快照隔离本身不能自动阻止写偏斜。

## 案例

1. 场景（教学示例）：两位值班医生分别看到另一个值班后同时退出。
2. 处理：在同一可锁定的排班记录上串行校验，或用受支持的更强隔离并处理重试。

3. 验证：至少一位继续值班；两连接交错测试覆盖并发，不能只测串行。

## 总结点

1. 快照不保跨行约束。
2. 锁住不变式边界。
