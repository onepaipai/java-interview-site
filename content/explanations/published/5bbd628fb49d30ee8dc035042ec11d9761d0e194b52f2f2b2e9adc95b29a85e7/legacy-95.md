<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)

</details>

## 参考回答

1. InnoDB 用事务信息、undo 版本链和 Read View 判断一致性读能看到哪个历史版本。
2. RC 每次一致性读建立新快照；RR 通常复用首次一致性读建立的快照。
3. 锁定读读取当前版本并加锁，本事务自己的写入也不能简单当作旧快照。

## 参考分析

1. 本事务创建的版本可见；其他版本先与快照记录的事务 ID 边界比较。
2. 低于最小活跃事务 ID 的版本可见；达到创建快照时下一事务 ID 的版本不可见。
3. 中间范围看活跃事务集合：在集合中不可见；不可见则沿 undo 查找旧版本。

## 案例

1. 场景（教学示例）：余额初始为 100，两个独立连接；分别重置数据，用 RC 和 RR 各执行一次。

2. 交错操作：T1 首次一致性读后，T2 改为 200 并提交；T1 再读同一行。

```text
T1: BEGIN; SELECT balance ...;       // 100
T2: UPDATE balance = 200; COMMIT;
T1: SELECT balance ...;              // RR:100，RC:200
T1: SELECT balance ... FOR UPDATE;   // 当前读:200
T1: ROLLBACK;
```

3. 验证：普通读的结果差异来自快照时机；FOR UPDATE 在 T2 提交后读取当前版本，不套用 RR 旧快照结论。

## 总结点

1. 先判可见性，再沿 undo 回溯。
2. RC 逐读建，RR 首读复用。
