<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银并发读沙盘:报表读不阻塞转账写——InnoDB 版本链(undo log)+Read View 可见性判定;RC 每语句新快照,RR 首读复用(第 43 题隔离级别同源)。

1. 三个组件:隐藏列(trx_id=最后修改事务 id,roll_pointer=指向 undo 旧版本)+undo log 版本链(每行历史版本串联,最新→旧遍历)+Read View(事务快照:m_ids=生成时活跃事务集合,min/max_trx_id=低/高水位,creator_trx_id=本事务)。
2. 可见性判定(沿版本链从新到旧找第一个可见版本):trx_id==creator→可见(自己的修改);trx_id<min→可见(快照前已提交);trx_id>=max→不可见(快照后开启);min<=trx_id<max→查 m_ids:在活跃集=不可见(未提交),不在=可见(已提交)——不可见则沿 roll_pointer 找上一版本继续判。
3. RC vs RR 的差别只在 Read View 生成时机:RC=每条语句生成新 Read View(总能看到最新已提交→不可重复读);RR=事务首次快照读生成并复用(整事务同一快照→可重复读)——MVCC 机制相同,快照时机不同(第 43 题实验对照的原理根)。

## 参考分析

### 第二步扩展① 机制:MVCC 为什么读不阻塞写

- 读走版本链(快照读,无锁)与写(当前读,加锁)并行——读写不互斥=并发度大增。
- 代价=旧版本存储(undo 膨胀:长事务期间旧版本不能清理→undo 表空间涨+清理线程被拖慢)——“长事务是 MVCC 的天敌”:事务开 1 小时,这 1 小时的所有历史版本都得留着(第 137 题长事务监控同源)。

### 第二步扩展② 反例:MVCC 的两种事故

- 事故一:长事务+高频写表——undo 持续膨胀(磁盘涨/查询变慢——沿版本链遍历变长)。
- 修复=拆小事务+information_schema INNODB_TRX 监控长事务告警。
- 事故二:误以为 MVCC 全程无锁——快照读无锁,但 update/for update 是当前读(加锁)——MVCC 只优化“读”,写并发仍靠锁(第 43 题混合读写的漂移问题同源)。

### 第二步扩展③ 取舍:快照时机的设计含义

- RC=新鲜度优先(每次看最新已提交,适合读最新状态的短查询)。
- RR=稳定性优先(同一快照,适合报表/对账/一致读)。
- 业务把关键读写进同一事务+显式当前读(for update)才强一致——MVCC 提供“不阻塞的一致读”,不替代“强一致的写序”。

## 案例

### 第三步发散·验证与推演 验证:可见性的实测走查

- 验证:RC 断言(A 事务两次读同一行,B 中间提交修改→两次值不同)。
- RR 断言(同场景两次值相同——快照复用)。
- 活跃集断言(B 未提交时 A 的 Read View 判其不可见,B 提交后新语句(RC)可见)。
- 版本链断言(锁分析/undo 空间观测:长事务期间 undo 不回收——数据库模块 19 题 Read View 实验同源可复跑)。
- 预期:四条判定规则与两级别对照全部成立。

### 第三步发散·发散要点 追问链:MVCC 三刀

- **追问①·undo 回收**：purge 线程清理无 Read View 引用的版本——长事务阻塞 purge(历史列表长度监控)
- **追问②·幻读的 MVCC 面**：快照读防幻(新插入行 trx_id>=max 不可见);当前读防幻靠 next-key 锁(第 43 题)
- **追问③·大事务定位**：INNODB_TRX 的 trx_started/trx_rows_locked+performance_schema——长事务治理的日常抓手

## 总结点

1. 隐藏列+版本链+Read View 三件套
2. 判定:自己的/已提交的可见
3. RC 每语句新快照,RR 首读复用
