<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银故障恢复沙盘:崩溃后为什么数据既不丢(redo)也不留脏(undo)、主从还能对齐(binlog)——三种日志三层职责:崩溃恢复的物理重放、回滚与快照的逻辑逆、复制的逻辑变更流。

1. redo log(InnoDB 物理日志):记录「页级物理修改」——保证持久性:WAL 先写日志后刷数据页,崩溃后重放 redo 把已提交的修改恢复(尽力把「丢失的内存数据」重放回来);循环写(固定大小,checkpoint 推进)——它服务的是「崩溃恢复」,不是复制。
2. undo log(InnoDB 逻辑日志):记录「逻辑逆操作」——两个职责:①回滚(事务失败时逆放)②MVCC 快照(旧版本链,第 18/95 题);随事务结束不立即删(快照引用期保留,第 20 题清理)——它服务的是「原子性+隔离性读」。
3. binlog(Server 层逻辑日志):记录已提交的逻辑变更(statement/row/mixed)——职责=复制+PITR;与 redo 配合=内部两阶段提交(redo prepare→写 binlog→redo commit),崩溃恢复以 binlog 完整性为提交判据。

## 参考分析

### 第二步扩展① 机制:两阶段提交为什么必须存在

- 若 redo 先提交后写 binlog 之间崩溃:主库有修改但从库没有(复制丢数据)。
- 若 binlog 先写:redo 未提交但从库已有(主从反向分叉)。
- 两阶段提交让「binlog 有=事务确实提交」成为判定依据——崩溃恢复扫描 redo prepare 状态的事务,查 binlog:完整→提交,缺失→回滚。
- 这是「两个日志一个真相」的一致性协议(2PC 的库内应用,第 152 题分布式 2PC 同构)。

### 第二步扩展② 反例:三种日志的混淆事故

- 事故一:以为 binlog 用于崩溃恢复——本地恢复靠 redo+undo(binlog 是复制/备份域),配置 binlog 巨大却不影响崩溃恢复性能。
- 事故二:undo 与 binlog 都「记录变更」混为一谈——undo 是引擎内回滚用,binlog 是复制用,格式与生命周期完全不同。
- 事故三:sync_binlog/innodb_flush_log_at_trx_commit 双 1 与性能——持久性参数的权衡(第 42 题ACID 持久性),降级=崩溃窗口丢数据,业务拍板。

### 第二步扩展③ 取舍:日志配置的三档

- 双 1(redo+binlog 每提交刷盘)=最高持久,TPS 低。
- 折中(binlog 1+redo 2)=崩溃窗口 1 秒丢——金融禁用。
- 组提交(group commit)+NVMe 让双 1 也有数千 TPS——先测硬件再降级。
- binlog 格式:ROW(主从安全+可读性差+量大)为默认——三种日志的配置都在「可靠性×性能」轴上,按业务等级定。

## 案例

### 第三步发散·验证与推演 验证:日志职责断言组(本机可复跑)

- 验证:redo 恢复断言(提交后 kill -9→重启数据在——redo 重放。
- 未提交 kill→消失——undo 回滚,第 42 题同源)。
- 两阶段断言(崩溃模拟半提交的恢复判定逻辑——推演+官方文档佐证)。
- binlog 断言(ROW 格式记录行镜像,主从重放一致——第 43 题呼应)。
- undo 快照断言(长事务期间版本链保留——第 20 题呼应)。
- 预期:三层职责在恢复场景各自显形。

### 第三步发散·发散要点 追问链:日志三刀

- **追问①**：GTID 与复制一致性——binlog 的全局事务号让主从对账/故障切换可判定(第 43 题复制);
- **追问②**：checkpoint 与 redo 循环——脏页推进决定 redo 可覆盖范围(checkpoint 太慢=redo 写满卡写入);
- **追问③·与备份的配合——全量备份+binlog 增量**：PITR(第 46 题备份验证),三种日志在备份体系各就各位

## 总结点

1. redo 管崩溃恢复,undo 管回滚+快照
2. binlog 管复制+PITR
3. 两阶段提交让 binlog 成提交判据
