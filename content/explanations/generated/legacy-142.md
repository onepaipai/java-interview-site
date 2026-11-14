<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:某明星商品(热点 key)QPS 10 万打到一个 Redis 节点(其他节点空闲);某大 key(100MB 的 JSON)一次 GET 卡住 Redis 2 秒——热 key 是流量问题,大 key 是数据问题,解法不同。

1. 热点 key:单 key QPS 超单节点承载→CPU 满影响其他 key——解法:本地 L1 缓存(命中不打 Redis)、key 加盐分片(分散到 N 节点)、读写分离(从节点读)。
2. 大 key:value 过大(>10KB string 或 >5000 元素)→读写耗时、删除阻塞、带宽打满——解法:拆分(大 JSON→多个小 key)、异步删除(UNLINK)、压缩、分页。
3. 发现手段:Redis --hotkeys、MONITOR 采样、客户端 QPS 埋点、rdb-tools 分析大 key——发现是治理的前提。

## 参考分析

### 机制:Redis 单线程为什么怕热 key 和大 key

Redis 的命令处理是单线程(6.0 后 IO 多线程但命令执行仍单线程):热 key 的 10 万 QPS 都排队在同一个线程→其他 key 的请求也被延迟(排队效应);大 key 的读写(序列化/内存分配)耗时毫秒到秒→阻塞线程→所有 key 延迟。单线程是 Redis 简洁与性能的来源,也是热/大 key 问题的根源。

### 反例:热点与大 key 的两种事故

事故一:热点 key 打挂节点——秒杀商品 ID 为 key,QPS 10 万→单节点 CPU 100%,该节点上其他缓存全部变慢;修复=本地 L1(读请求 90% 不打 Redis)+加盐分片。事故二:大 key DEL 阻塞——删除 100MB 的 key,DEL 同步释放内存→Redis 卡 2 秒→所有请求超时;修复=UNLINK(异步释放)+SCAN 分批删大集合。

### 取舍:本地缓存的一致性代价

L1 本地缓存(应用内存)命中率高(不打 Redis)但一致性差(多实例各自缓存,更新不同步)——适合"容忍短暂旧值"的场景(商品详情,第 48 题分布漂移容忍);强一致场景(库存)不用本地缓存(走 Redis 原子操作,第 22 题扣减)。

## 案例

### 验证:热点与大 key 的走查核对

验证:热点 key 断言(L1 缓存命中后 Redis QPS 下降实测);加盐分片断言(10 万 QPS 分散到 N 节点,各节点均匀);大 key 拆分断言(100MB JSON 拆成 Hash field 后 GET 延迟<1ms);异步删除断言(UNLINK 不阻塞)。验证:压测数据(热点 key 前后的节点 CPU/延迟对照)——发现+治理+验证三步闭环。

### 追问链:热 key 三刀

一刀:"热 key 的预防?"——容量规划时预估热点(秒杀商品/热搜内容可预测)→提前加盐/预热本地缓存(第 22 题策略);监控告警(单 key QPS 超阈→告警)。二刀:"大 key 的预防?"——入库前校验(value 大小上限,第 2 题闸门)+集合元素数上限——大 key 的治理从"不产生"开始。三刀:"热 key 与缓存击穿的关系?"——热 key 过期=瞬间大量请求打到 DB(缓存击穿,cache-messaging 批次专项)——热 key 的流量放大了击穿的影响;解法=逻辑过期(不物理删除)+互斥锁(第 15 题 singleflight)。

## 总结点

1. 热 key=流量问题,加盐+L1
2. 大 key=数据问题,拆分+UNLINK
3. 发现是治理的前提
