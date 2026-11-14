<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银事务沙盘:事务 A 锁行 1 等行 2,事务 B 锁行 2 等行 1——InnoDB wait-for 图检测→回滚代价小的一方→应用重试;排查=SHOW ENGINE INNODB STATUS 的 LATEST DETECTED DEADLOCK 段(第 101 题数据库死锁的完整版)。

1. 死锁的产生:加锁顺序不一致(事务 A 按行 1→2,事务 B 按行 2→1)+并发(两个事务同时执行)→循环等待;InnoDB 的检测=wait-for 图(是否有环)→选择回滚代价小的事务(undo 量少的一方)。
2. 排查:SHOW ENGINE INNODB STATUS→LATEST DETECTED DEADLOCK 段列两个事务的 SQL/持有锁/等待锁/锁模式——两段对照=还原谁先拿的谁在等(第 101 题 database-basics 详解)。
3. 避免:统一加锁顺序(按 ID 排序)+缩小事务范围(短事务)+索引优化(减少锁范围)+失败重试(捕获 deadlock/lock-wait 错误→退避重试,第 119 题幂等键)。

## 参考分析

### 机制:死锁检测的代价

wait-for 图检测:每次锁等待时检查是否有环(锁等待频繁时检测开销增加);innodb_deadlock_detect=ON(默认)可关闭(高并发如热点行更新时关闭死锁检测+依赖锁等待超时 innodb_lock_wait_timeout)——关闭检测的代价=死锁不会被自动回滚(靠超时解锁)——热点行更新场景的取舍(第 122 题热点账户)。

### 反例:死锁的两种事故

事故一:死锁重试无幂等——回滚的事务重试时重复执行副作用(第 119 题幂等键缺失);修复=重试携带幂等键。事故二:死锁频率高但被忽略——偶发死锁被"系统繁忙"掩盖(未审计);修复=死锁日志监控(频率告警)+锁序审计(第 101 题 database-basics 的锁序审计)。

### 取舍:死锁检测开与关的权衡

开启(默认):自动回滚死锁(应用需处理重试);关闭(热点行场景):减少检测开销,死锁靠锁等待超时解锁——innodb_lock_wait_timeout 默认 50s(太长,热点行场景建议调短如 3-5s)——关闭检测的前提=有超时兜底+应用处理超时重试。

## 案例

### 验证:死锁的走查核对

验证:死锁复现(两个事务反向锁定→InnoDB 检测回滚一方);日志解读断言(LATEST DETECTED DEADLOCK 段的两事务对照);重试断言(捕获 1213 ER_LOCK_DEADLOCK→退避重试→成功);锁序修复断言(统一顺序后零死锁)。验证:database-basics 26 题的锁报告解读+banking 7 题锁序实验可复用。

### 追问链:死锁三刀

一刀:"死锁与锁等待超时的区别?"——死锁=循环等待(InnoDB 检测回滚);锁等待超时=等待时间超 innodb_lock_wait_timeout(不一定死锁,可能只是慢)——两种失败的重试策略不同(死锁重试,超时需先诊断)。二刀:"间隙锁死锁?"——两个事务都持间隙锁→都尝试插入→插入意向锁冲突→死锁(间隙锁不冲突但插入冲突,第 96 题间隙锁);修复=RC 或统一插入顺序。三刀:"热点行更新的死锁?"——热点行(秒杀库存)大量并发更新→锁排队(非死锁但吞吐低,第 122 题)+死锁(不同顺序触达多行)——热点行的解法=Redis 预扣/影子账户/排队(第 122 题)。

## 总结点

1. InnoDB wait-for 图自动检测回滚
2. LATEST DETECTED DEADLOCK 两事务对照
3. 锁序统一+幂等重试=死锁防线
