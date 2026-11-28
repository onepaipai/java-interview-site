<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:手写 LRU 缓存承载"最近使用的账户信息"——LinkedHashMap 一行实现与手写双向链表的取舍、并发安全与容量淘汰策略。

1. LinkedHashMap 实现:new LinkedHashMap<>(cap, 0.75f, true)(accessOrder=true)+重写 removeEldestEntry——继承哈希表+双向链表,put 时自动移到尾部,get 也移动(访问序),最老的在头部,重写回调淘汰。代码 5 行,但依赖 JDK 内部行为且非线程安全。
2. 手写双向链表+HashMap:哈希表存 key→Node,Node 含 key/value/prev/next——put 时尾部追加+哈希表映射,get 时节点移到尾部;淘汰时移除头节点+哈希表删除。代码 50 行但完全可控(可加 TTL/过期策略/并发分段)。
3. 并发 LRU:Collections.synchronizedMap 包装(粗粒度锁)或分段锁(ConcurrentHashMap 思路)或 CAS 无锁(复杂,第 19 题 LongAdder 同源)——读多写少场景读写锁较优(并发基础 25 题)。

## 参考分析

### 第二步扩展① 机制:LinkedHashMap 的 accessOrder 模式

- LinkedHashMap 继承 HashMap 但额外维护双向链表串联所有 Entry——插入序(insertionOrder)或访问序(accessOrder)。
- accessOrder=true 时 get/put 都把节点移到链尾(最近使用),链头就是 LRU 候选。
- removeEldestEntry(eldest) 在 put 后回调,返回 true 即删除链头。
- 比手写简洁但淘汰策略受限(只按容量,不好加 TTL)——需要定制淘汰时手写更灵活。

### 第二步扩展② 反例:LRU 实现的三种事故

- 事故一,LinkedHashMap 并发使用——非线程安全,多线程 get/put 结构破坏(第 2 题 HashMap 并发同源)。
- 修复= Collections.synchronizedMap 或分段。
- 事故二,手写版忘记维护反向链接——删除中间节点时 prev/next 没互相指,链表断裂,后续 get 返回 null。
- 修复=双向前驱后继都要更新。
- 事故三:容量满后不淘汰只拒绝——缓存永远存最初的数据,新数据进不来。
- 修复=removeEldestEntry 或手写 removeHead。

### 第二步扩展③ 取舍:JDK 实现与手写的边界

- 原型/单线程/标准 LRU:LinkedHashMap 首选(正确性由 JDK 保证)。
- 生产/高并发/需定制(加 TTL/分权重/过期队列):手写(或用 Caffeine 库——第 20 题已封装了 W-TinyLFU 等高级策略)。
- 评审标准:手写版的代码评审要覆盖并发/边界/淘汰三面,LinkedHashMap 版的评审覆盖并发一面。

## 案例

### 第三步发散·验证与推演 验证:LRU 行为的断言组

- 验证:顺序断言(put A/B/C+get A→淘汰 B 而非 A——A 被访问移尾)。
- 容量断言(超容后 eldest 被移除)。
- 并发断言(多线程 put+get 无结构破坏)——三组固化 LRU 语义。
- 本机实验(反射读链表)已在 collections C1 验证:16 桶 30 个同桶键的树化轨迹(同源)。

### 第三步发散·追问扩展 追问链:LRU 三刀

- **Q1：LFU 与 LRU 怎么选?**
  - 答：LRU 按时间衰减(偶发批量扫描会冲掉热点),LFU 按频率(历史热点不遗忘但新热点难上位);Caffeine 的 W-TinyLFU 融合两者。
- **Q2：TTL 与 LRU 的关系?**
  - 答：LRU 淘汰最久未用,TTL 淘汰过期——两者正交,生产缓存两者都要(Caffeine expireAfterWrite+maximumSize)。
- **Q3：分布式 LRU?**
  - 答：Redis 的 allkeys-lru(第 15 题淘汰策略)或一致性哈希分片(第 4 题分布式)——单机 LRU 与分布式缓存的淘汰是两层设计。

## 总结点

1. LinkedHashMap 5 行,手写 50 行
2. accessOrder 自动移尾,eldest 淘汰
3. 并发是第一坑,定制选手写
