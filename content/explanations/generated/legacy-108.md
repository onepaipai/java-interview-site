<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/develop/reference/eviction/)
- [Kafka 4.1 设计 · 3](https://kafka.apache.org/41/design/design/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银分布式锁沙盘:SET key value NX PX ttl(原子加锁)+Lua 比对 value 删除(原子解锁)+看门狗续约(防业务超时锁过期)+Redlock(多节点,第 108 题Redis 分布式锁的完整版)。

1. 基本实现:加锁=SET lock:key uniqueValue NX PX 30000(NX=不存在才设/PX=过期时间);解锁=Lua 脚本(GET 比对 value→相等则 DEL——原子,防误删他人锁);value=持有者标识(UUID+线程 ID——防实例 A 删实例 B 的锁)。
2. 过期时间的困境:TTL 太短→业务未完成锁过期→另一实例获锁→双持锁(互斥失效);TTL 太长→持有者崩溃后锁长期占用(其他实例等);解决=看门狗(定期续约 TTL——业务完成前锁不过期)——Redisson 的 watchdog 默认 30s,每 10s 续约。
3. Redisson:RLock(可重入锁)+watchdog(自动续约)+RLock.tryLock(waitTime, leaseTime)(限时+自动续约)——Redisson 封装了 Lua 解锁/续约/可重入等细节;Redlock=向 N 个独立 Redis 实例同时加锁(过半成功)——解决单点主从切换丢锁(但有争议,第 14 题缓存消息)。

## 参考分析

### 机制:主从切换时锁丢失的问题

Redis 主从是异步复制:主库 SET NX 成功→未同步到从库→主库宕机→从库晋升→新主库无此锁→另一实例获锁→双持锁——Redis 锁的"不安全窗口"=主从切换瞬间;Redlock(多节点过半)缓解但不能完全解决(Kleppmann 的批评:时钟假设+假死窗口,第 14 题)——结论:Redis 锁做效率层(挡 99%)+资源端 fencing 做正确层(挡最后 1%)。

### 反例:Redis 锁的三种事故

事故一:解锁不比对 value——直接 DEL(删了别人的锁);修复=Lua 脚本比对+删除原子操作。事故二:无看门狗——TTL 30s 但任务 60s→30s 后锁过期→双跑;修复=Redisson watchdog 或手动续约(定时延长 TTL)。事故三:锁内调用 RPC 超时——锁在 TTL 内但 RPC 5s 超时→看门狗续约→锁一直持有→其他实例永久等待;修复=RPC 超时预算+锁的 TTL 上限(续约次数限制)。

### 取舍:Redis 锁 vs ZK 锁 vs 数据库锁

Redis:吞吐高(AP,主从切换可能丢锁)+看门狗续约;ZK:可靠(CP,会话断开自动释放)+吞吐低;数据库:SELECT FOR UPDATE+事务释放(最简单+性能最差)——定时任务互斥→Redis 锁(吞吐够+偶发双跑可容忍→幂等兜底);强互斥(资金)→ZK 或数据库锁(可靠性优先)。

## 案例

### 验证:Redis 锁的走查核对

验证:加锁断言(SET NX 成功/重复加锁失败);解锁断言(Lua 比对 value→只删自己的锁);看门狗断言(TTL 自动续约→业务完成前锁不过期);误删断言(实例 A 的锁过期→实例 B 获锁→A DEL→B 的锁不受影响);双持锁推演(主从切换窗口——标注推演,第 14 题)。验证:锁的断言可程序化(Redis CLI+Lua 脚本);D15 租约/栅栏实验(旧 token 写入被拒)。

### 追问链:锁三刀

一刀:"Redisson 的 watchdog 细节?"——默认 lockWatchdogTimeout=30s;每 lockWatchdogTimeout/3=10s 续约一次;业务完成后 cancel watchdog+释放锁——看门狗的前提=Redisson 客户端活着(进程崩溃=看门狗停止=锁过期)。二刀:"锁的粒度?"——按资源粒度(lock:order:12345)+按操作类型(lock:order:12345:update)——粒度过粗(全局锁)=不必要的阻塞;过细(每字段一锁)=锁爆炸。三刀:"锁与幂等的关系?"——锁=互斥(同一时刻一个);幂等=重复执行安全(多次执行结果相同)——锁失效时幂等兜底(纵深防线,第 119 题幂等+第 38 题查单先行);锁是优化,幂等是防线。

## 总结点

1. SET NX PX+Lua 解锁+看门狗续约
2. 主从切换可能丢锁→fencing 兜底
3. 锁是优化,幂等是防线
