<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)

</details>

## 参考回答

1. 标准层面从读未提交、读已提交、可重复读到可串行化逐步限制异常；具体读写实现要看数据库。InnoDB 默认是可重复读。
2. InnoDB RR 普通一致性读通常复用快照，范围锁定读可能用 next-key 等机制；不能只背可重复读必然幻读来解释全部语句。

## 参考分析

1. RC 普通一致性读逐次建立快照；RR 的首次一致性读时点与事务开始不同，自身写入还影响结果。
2. 更强隔离可能增加等待和重试，应用仍需正确处理失败及业务幂等。

## 案例

1. 教学场景：A 两次读取之间 B 提交更新或新行，分别比较 RC、RR 普通查询。

2. 固定双连接时序，再单独测试锁定读与写入，不把输出不同都叫幻读。

3. 验证现象对应指定级别和语句，配置实际值需要查询确认；未执行 MySQL 不用 H2 结果代替。

## 总结点

1. 级别名称与实现机制分开。
2. 快照读和锁定读分别推演。
