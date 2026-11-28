<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：MySQL 8.4 / InnoDB 教学时序：A 事务先读账户余额，B 修改并提交，A 再做普通一致性读；分别设置 READ COMMITTED 与 REPEATABLE READ，锁定读另测。

1. 在典型 InnoDB 一致性读中，READ COMMITTED 每次一致性读建立新的快照；REPEATABLE READ 通常复用本事务第一次一致性读建立的快照。
2. 普通 START TRANSACTION 不等于立刻建立该读快照，WITH CONSISTENT SNAPSHOT 等入口还有条件；本事务自己的修改也会影响可见结果。
3. SELECT FOR UPDATE 等锁定读与 DML 不能机械套同一 Read View 结论。回答必须说明语句、隔离级别和快照建立时点。

## 参考分析

### 第二步扩展① 快照时点：先开始事务不等于先看到了旧版本

- A 只执行 START TRANSACTION 而尚未普通查询时，B 的提交可能发生在 A 第一次一致性读之前，此后 A 的快照可能已经包含 B。
- 要比较两种级别，必须先让 A 真正建立一致性读，再组织 B 提交。
- 快照建立时点有三种情况：普通 START TRANSACTION 的 RR 在首次一致性读时才建立快照。
- START TRANSACTION WITH CONSISTENT SNAPSHOT 在语句执行时立即建立（不等首次读）。
- RC 每次一致性读都新建，该入口对 RC 无附加效果。
- 类比照相的快门时刻：RR 是第一次拍照定格，RC 是每问一次重拍一张，WITH CONSISTENT SNAPSHOT 是进棚就按快门——事务开始不等于快门按下。

### 第二步扩展② 自身写入：可重复读不等于每条查询完全不变

- 快照约束的是其他事务版本的可见性，本事务已经修改的数据仍可以被自己读取。
- 结果可能混合本事务新写入与快照中的其他行，因此并不必然对应历史上某个完整数据库时刻。
- 讨论资金或库存决策时，要同时考虑写冲突和业务条件，而不是只依赖一个固定快照就宣称并发不变式成立。

### 第二步扩展③ 语句类型：普通查询和锁定操作有不同目的

- 锁定读面向需要保护的当前记录，UPDATE 也不是简单读取旧快照后无条件写回。
- 相同事务内混用普通 SELECT 与锁定读可能看到不同状态，需要用语句类型解释而非称为数据库失去可重复性。
- 切换隔离级别还会影响锁策略，不能只比较两次 SELECT 输出就完成业务隔离评估。

### 第二步扩展④ 版本链：Read View 判什么、怎么判

- 可见性判定的对象是行上的隐藏列：每行带 trx_id（最后修改它的事务号）与 roll_pointer（指向 undo log 中的历史版本），多次修改串成版本链。
- Read View 含四个关键字段——creator_trx_id（本事务号）、m_ids（生成时刻的活跃事务集合）、min_trx_id（最小活跃号）、max_trx_id（下一个将分配的号）。
- 判定沿链进行：trx_id 小于 min_trx_id 可见。
- 大于等于 max_trx_id 不可见。
- 落在 m_ids 中不可见，否则可见。
- 不可见就顺 roll_pointer 找上一版本重判，直到找到可见版本或链尾。
- RC 与 RR 用的是同一条版本链，差别只在换 Read View 的时点——这解释了快照时点块的结论。

## 案例

### 第三步发散·验证与推演 双连接时序：第一次读后再让 B 提交

- 隔离 MySQL 中准备余额 10，A 在选定级别关闭自动提交并做普通 SELECT。
- B 将余额改成 20 后提交。
- A 再普通 SELECT，最后结束事务。
- 预期在无自身修改等其他条件时，RC 第二次可读到 20，RR 仍读取既定快照的 10。
- 用显式提交和闩锁组织先后，保留引擎版本，不用睡眠猜测。

### 第三步发散·追问① 对照追问：把第一次查询移到 B 提交之后

- 重新准备数据，让 A 先开始但不查询，B 提交后 A 才首次读取，再比较结果。
- 另加 A 自身写入和 FOR UPDATE 路径。
- 预期能区分快照建立、自己可见与锁定语义。
- 本机未运行 MySQL 时只记录该实验待验证，不能拿 H2 的相似输出证明 InnoDB Read View 实现已经执行通过。

## 总结点

1. RR 首拍定格，RC 每问重拍
2. RC 逐次读，RR 通常首次读定快照
3. 事务开始与快照建立分清
4. 自身写入和锁定读另分析
