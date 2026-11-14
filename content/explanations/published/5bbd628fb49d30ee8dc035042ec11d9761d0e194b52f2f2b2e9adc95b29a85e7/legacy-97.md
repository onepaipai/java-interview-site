<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

1. redo 支持崩溃恢复，undo 支持回滚与历史版本，binlog 支持复制和恢复。
2. MySQL 内部提交协调使 redo 与 binlog 的事务状态可在恢复时对齐。
3. 刷盘策略、设备与故障类型共同决定丢失窗口，内部协调不等于跨服务事务。

## 参考分析

1. 刷盘配置存在吞吐和丢失窗口取舍。
2. 提交成功的语义不能只看应用内存。
3. 存储设备与故障类型同样影响结果。

## 案例

1. 场景（教学示例）：主库断电后检查最近已确认交易。
2. 处理：在隔离环境按配置注入故障，恢复后比对已确认流水、redo/binlog 与副本状态。

3. 验证：可说明实际恢复点；不把进程退出试验等同于断电持久性证明。

## 总结点

1. 三类日志分职责。
2. 持久性看故障假设。
