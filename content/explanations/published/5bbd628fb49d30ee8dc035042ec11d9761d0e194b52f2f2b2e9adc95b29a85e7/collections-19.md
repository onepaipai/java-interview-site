<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银限流沙盘:用 CHM.size() 做并发数限制(size>=N 拒绝)——size 是弱一致估计(CounterCell 分片计数),并发下不精确——精确业务控制用 Semaphore/AtomicLong(第 23 题分布式限额的原子累计同构)。

1. size 的实现:baseCount+CounterCell[](分片计数,避免单点竞争)——求和时无全局锁:结果是"某一时刻的近似"(并发写进行中,某些 cell 未并入);isEmpty/size 同源弱一致。
2. 业务控制的误用:if (map.size() >= max) reject——弱一致下并发放行超限(第 23 题 banking 限额穿透同构);精确控制用 Semaphore(tryAcquire 原子)或 AtomicLong 累计(条件 CAS)。
3. size 的合法用途:监控/采样/近似判断(非精确业务门槛)——弱一致是设计选择(吞吐换精确),用对地方。

## 参考分析

### 机制:分片计数与弱一致

CounterCell:计数分散到 baseCount+多个 cell(线程绑 cell,竞争分散)——size=遍历求和(sumCount)且求和本身无锁:遍历期间 cell 仍可能被改,这才是弱一致的根因;这套分片计数是 Striped64 框架,LongAdder 与 CHM 计数同源(同一设计两种封装)。写路径:casBaseCount 或 cell 累加——cell 未并入时求和偏小(弱一致)。AtomicLong 的对照:单值 CAS(精确但竞争集中)——精确与吞吐的取舍(第 23 题 banking:DB 累计 vs Redis 预扣同构)。

### 反例:size 限流的穿透

沙盘:并发数限制用 map.size()>=100 拒绝——弱一致下 105 个并发请求全部通过(size 读到 99)——限流穿透(第 23 题 banking 的穿透同构);资源(连接/线程)超限故障。修复:Semaphore(100, tryAcquire 原子)/AtomicLong.incrementAndGet<=100 的 CAS——精确控制的工具是同步原语,不是容器的统计。

### 取舍:近似与精确的分界

近似够用:监控面板(误差可接受)、缓存淘汰参考(近似 LRU)、采样判断。精确必须:限额(资金/资源)、去重计数(业务唯一性)、同步屏障——精确场景的原子原语(Semaphore/LongAdder 读多写少/AtomicLong)。LongAdder 的定位:CHM size 的计数机制独立成类(写分散读求和)——高并发计数器(监控指标,第 48 题)首选;精确控制仍用 AtomicLong/CAS。

## 案例

### 验证:弱一致的演示断言

验证:并发断言(多线程高频写,size 求和采样与 AtomicLong 真值对照——偏差可见);精确控制断言(Semaphore 的限流零穿透;map.size() 限流的穿透复现)——对照组把"弱一致 vs 原子"的行为差异固化;本机 C2 的 size=0 形态(put/remove 后)为弱一致的旁证。

### 追问链:size 三刀

一刀:"mappingCount 与 size?"——mappingCount() long 版(size int 溢出风险,>21 亿)——大容量用 long 版;弱一致语义相同。二刀:"精确统计的方案?"——AtomicLong/LongAdder(计数)+CHM 存数据(数据与计数分离)——计数的精确与数据的弱一致分层(各取所需)。三刀:"keySet().size()?"——同弱一致(遍历求和)——换口径不换语义;精确等价物不存在于 CHM——接受或换工具。

## 总结点

1. size 是估计,不是账本
2. 精确控制用 Semaphore 或 CAS
3. 弱一致有它的用武之地
