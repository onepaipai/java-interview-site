<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [OWASP 提示注入风险 · 2](https://genai.owasp.org/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银运维沙盘:RDB(快照,恢复快但丢数据)+AOF(追加命令,丢数据少但文件大)→混合持久化(aof-use-rdb-preamble);过期(惰性+定期)+淘汰(maxmemory-policy 8 种)。

1. RDB:定期快照(save 阻塞/bgsave fork 子进程)——恢复快(直接加载二进制)+文件小;丢数据(最后一次快照后的变更丢失);fork 的代价=bgrewriteaof 时的内存复制(COW)——大实例 fork 耗时(秒级,主线程暂停)。
2. AOF:追加写命令(appendonly yes)——丢数据少(everysec 最多丢 1 秒/always 不丢但性能差/no 由 OS 决定)+文件大(AOF 重写 bgrewriteaof 压缩);AOF 重写=根据当前数据生成最小命令集(替代历史命令堆积)。
3. 混合持久化(aof-use-rdb-preamble=yes,4.0+默认):AOF 文件=RDB 快照头+AOF 增量尾——恢复时先加载 RDB(快)再重放 AOF 增量(丢数据少)——兼得两者优点(Redis 4.0+)。
4. 过期策略:惰性(访问时检查,过期则删)+定期(周期抽样过期 key 删除——每 100ms 抽样);淘汰策略(maxmemory 达到后):noeviction(默认,拒绝写)/allkeys-lru/allkeys-lfu/allkeys-random/volatile-lru/lfu/random/ttl(仅有过期 key 的子集)。

## 参考分析

### 第二步扩展① 机制:RDB 的 fork 与 COW

- bgsave 时 fork 子进程(共享父进程内存页——写时复制 COW)。
- 父进程修改数据→COW 复制修改的页(子进程看到的是快照)。
- fork 的耗时=页表复制(内存越大越慢,100GB≈秒级)——大实例的 fork 是 RDB 的主要风险(主线程暂停)。

### 第二步扩展② 反例:持久化的两种事故

- 事故一:AOF everysec 丢 1 秒——金融场景不可接受(交易数据)。
- 修复=always(每命令 fsync,性能降 10 倍)或 Redis 只做缓存+DB 做主存储(数据不丢)。
- 事故二:混合持久化未开启——AOF 文件巨大(重写慢)+恢复慢(逐命令重放)。
- 修复=开启混合(RDB 头+AOF 尾)。

### 第二步扩展③ 取舍:持久化策略的选择

- 纯缓存(可丢失):RDB 或不持久化(重启从 DB 加载)。
- 持久存储(Redis 当主存):AOF always+主从+哨兵(数据安全)。
- 混合(缓存+部分持久):混合持久化+everysec——按"Redis 中数据的可丢失程度"选持久化策略(第 104 题Redis 的角色)。

## 案例

### 第三步发散·验证与推演 验证:持久化的走查核对

- 验证:RDB 断言(bgsave→dump.rdb 生成→重启后数据恢复)。
- AOF 断言(appendonly yes→命令追加→重启重放)。
- 混合断言(AOF 文件头=RDB 格式→恢复速度快)。
- 过期断言(TTL 到期→惰性/定期删除)。
- 淘汰断言(maxmemory→allkeys-lru→LRU key 被逐出)。
- 验证:持久化与过期的断言可程序化(Redis CLI+配置)。

### 第三步发散·追问扩展 追问链:持久化三刀

- **Q1：AOF 重写的触发?**
  - 答：auto-aof-rewrite-percentage(100%,文件翻倍时)+auto-aof-rewrite-min-size(64MB 最小值)——重写时 fork(同 RDB 的 COW);重写期间新命令写新旧两个 AOF 缓冲。
- **Q2：Redis 集群的持久化?**
  - 答：每个节点独立持久化(RDB/AOF)——节点故障=该节点数据可能丢失(从节点接管,但异步复制可能丢);持久化策略按"节点角色"调整(主节点 AOF everysec,从节点可 RDB)。
- **Q3：主从+哨兵+持久化的组合?**
  - 答：哨兵(自动故障转移)+主从(数据冗余)+持久化(重启恢复)——三层高可用:哨兵管切换、主从管冗余、持久化管恢复(第 141 题高可用)。

## 总结点

1. RDB 快照+AOF 追加+混合持久化
2. fork COW=大实例的风险
3. 淘汰策略=内存满时的行为选择
