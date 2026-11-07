<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)

</details>

## 参考回答

1. redo 面向 InnoDB 崩溃恢复，undo 用于事务回滚及多版本读取，binlog 是服务器层变更事件日志，常用于复制与时间点恢复。
2. 它们层次和保留目的不同，不能把其中一种当其他日志或完整备份的替代。

## 参考分析

1. 提交与日志持久策略要配合解释，redo 的存在不自动等于任意配置下断电零丢失。
2. 时间点恢复通常需要可恢复基线加连续日志，undo 并不是可任意回到历史日期的业务备份。

## 案例

1. 教学场景：误删数据后团队试图只靠 undo 找回一周历史，实际已被清理。

2. 分别制定崩溃恢复、事务回滚、复制和备份加日志恢复方案，核对保留周期及密钥。

3. 验证隔离恢复得到目标业务状态，并记录实际恢复点；不能因日志文件存在就宣称完整可恢复。

## 总结点

1. redo 恢复，undo 回滚与版本。
2. binlog 支撑复制和日志恢复。
