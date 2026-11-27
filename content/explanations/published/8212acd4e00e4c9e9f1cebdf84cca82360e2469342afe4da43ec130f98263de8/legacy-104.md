<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:Redis 五大数据类型(String/Hash/List/Set/ZSet)+特殊类型(Bitmap/HyperLogLog/Stream/Geo)——快的原因=内存存储+单线程无锁+IO 多路复用+高效数据结构。

1. 五大数据类型:String(缓存/计数器/分布式锁 SETNX)、Hash(对象/购物车)、List(LPUSH/BRPOP 队列/时间线)、Set(去重/共同好友 SINTER/抽奖)、ZSet(排行榜/延迟队列 ZADD/ZRANGEBYSCORE)。
2. 特殊类型:Bitmap(签到/在线状态——SETBIT/BITCOUNT,百万用户仅 125KB)、HyperLogLog(基数统计——UV 估算,0.81% 误差,12KB 固定内存)、Stream(消息队列——XADD/XREADGROUP,消费者组)、Geo(地理位置——GEOADD/GEOSEARCH)。
3. Redis 为什么快:一,内存存储(内存访问 vs 磁盘 IO);二,单线程无锁竞争(命令队列,无上下文切换——6.0 IO 多线程但命令仍单线程);三,IO 多路复用(epoll——单线程处理数万连接);四,高效数据结构(SDS 动态字符串/跳表 ZSet/压缩列表 ziplist→listpack)。

## 参考分析

### 第二步扩展① 机制:每种类型的底层数据结构

- String=SDS(简单动态字符串——预分配+惰性释放,二进制安全)。
- Hash=ziplist(小哈希,紧凑)或 hashtable(大哈希)。
- List=quicklist(双向链表+ziplist 节点)。
- Set=intset(整数集合)或 hashtable。
- ZSet=ziplist 或 skiplist+hashtable(跳表+哈希双结构)——编码转换由元素数与值大小自动决定(小数据省内存,大数据保性能)。

### 第二步扩展② 反例:Redis 使用的两种事故

- 事故一:大 key(第 142 题热 key/大 key)——100MB JSON→GET 卡 Redis 2 秒。
- 修复=拆分(Hash field)或压缩。
- 事故二:无过期时间的缓存——缓存只加不删→内存耗尽→淘汰策略触发(误删其他 key)。
- 修复=SET EX(带 TTL)+maxmemory-policy(allkeys-lru)。

### 第二步扩展③ 取舍:Redis vs Memcached vs 本地缓存

- Redis:丰富数据结构+持久化+主从+集群——功能最全。
- Memcached:纯 KV+多线程(高并发简单 KV)——无持久化/无丰富结构。
- 本地缓存(Caffeine):最快(无网络)+不一致(多实例各自缓存)——多级缓存(L1 本地+L2 Redis)是常见组合(第 142 题热 key)。

## 案例

### 第三步发散·验证与推演 验证:Redis 的走查核对

- 验证:五类型断言(String SET/GET/INCR。
- Hash HSET/HGETALL。
- List LPUSH/BRPOP。
- Set SADD/SINTER。
- ZSet ZADD/ZRANGE)。
- 性能断言(benchmark:Redis 10 万 QPS vs DB 5000 QPS)。
- 特殊类型断言(Bitmap BITCOUNT/HyperLogLog PF COUNT 误差)。
- 本机 cache-messaging 批次的 Redis 实验可复用。

### 第三步发散·追问扩展 追问链:Redis 三刀

- **Q1：Redis 的持久化?**
  - 答：RDB(快照,恢复快但丢数据)+AOF(追加,丢数据少但文件大)——混合持久化(aof-use-rdb-preamble:RDB 头+AOF 尾,第 107 题 Redis 详解)。
- **Q2：Redis 的分布式锁?**
  - 答：SET NX PX+Lua 解锁+看门狗续约(第 108 题Redis 分布式锁详解)。
- **Q3：Redis 的热 key/大 key?**
  - 答：热 key=本地缓存+加盐分片(第 142 题);大 key=拆分+UNLINK(异步删除)——发现是治理的前提(--hotkeys/rdb-tools)。

## 总结点

1. 内存+单线程+epoll+高效结构=快
2. 五类型+特殊类型按场景选
3. 持久化+过期+淘汰是运维三件套
