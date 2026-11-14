<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:computeIfAbsent 的加载函数里调远程接口(200ms)——同桶的其他键操作全部排队 200ms(桶头锁被占);更糟:远程超时 30 秒=同桶雪崩。用桶锁粒度说明函数内长任务的代价与占位模式。

1. 锁的粒度:computeIfAbsent 的函数在桶头 synchronized 内执行——函数 200ms=该桶(及 hash 相邻冲突键)的所有操作阻塞 200ms;热点桶+慢函数=局部雪崩(第 15 题分布式 singleflight 的函数内 IO 同题)。
2. 占位模式:computeIfAbsent(key, 占位 future)→桶锁立即释放→异步加载→future.complete——加载长但锁短;同键并发等 future(第 16 题 putIfAbsent 的扩展)。
3. 禁忌清单:函数内禁远程 IO/禁再操作同 map(死锁或 IllegalStateException——递归 update)/禁抛异常后的残留状态(compute 异常=键未放入,重试语义要显式)。

## 参考分析

### 机制:桶锁的占用链

占用链:computeIfAbsent→桶头锁→mappingFunction(200ms RPC)→同桶所有操作等待——等待面=同桶键集(hash 分桶下的"邻居");函数内再调同 map 的其他键(不同桶)→锁不同桶(不死锁但延长持有时间);同桶键(或递归同键)→死锁/异常。本机 C2 实验的 CHM 吞吐(91ms)建立在"函数轻"的假设上——重函数直接劣化。

### 反例:慢函数的局部雪崩

沙盘:配置缓存 computeIfAbsent(key, k -> remoteConfig(k))(远程 200ms,P99 2 秒)——配置键 hash 集中在少数桶(键设计问题,第 3 题)——一个慢加载拖住整个桶:该桶其他配置键的读取全部等待 2 秒——接口超时面扩大。修复:占位模式(锁内只放 future)+远程加载异步化+加载超时与降级(默认配置,第 25 题分布式分级降级)。

### 取舍:同步加载与异步占位的权衡

同步加载(函数内直查):代码简单/调用方拿到即用——锁占用与雪崩风险。异步占位:锁短/并发安全——代码复杂(future 生命周期/异常传播/超时)。判据:加载时长(<1ms 纯计算→同步;含 IO→异步占位)——IO 在锁内是普适禁忌(数据库/远程/文件全算)。降级:加载失败时的策略(缓存 null 占位防穿透?null 被 CHM 拒——用 Optional/哨兵对象,第 18 题 null 语义)。

## 案例

### 验证:桶锁占用的断言组

验证:阻塞断言(慢函数 500ms 期间,同桶他键的 get 延迟≈500ms——计时证据);占位模式断言(占位形态下同桶 he键 get 不受慢加载影响);递归异常断言(函数内同 map put,断言异常)——三组固化"函数轻"纪律的必要性。

### 追问链:桶锁三刀

一刀:"为什么桶锁不是全局锁?"——CHM 的并发设计(分桶)=吞吐与正确性的平衡(第 2 题 91ms vs 233ms 的来源);全局锁退化为 synchronizedMap。二刀:"函数内查 DB 呢?"——同远程 IO(DB 50ms 也是长)——占位模式同样适用;DB 查询的缓存加载是 computeIfAbsent 的最常见误用场景。三刀:"锁内的异常?"——mappingFunction 抛异常→键未放入→锁释放——语义:异常即"本次加载失败"(下次重试)——重试风暴的防护(退避+熔断,分布式 13 题)在函数外层负责。

## 总结点

1. 桶锁内禁 IO,200ms 拖垮一桶
2. 占位模式:锁短加载长
3. 函数内禁递归同 map
