<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银计数沙盘:CHM 的并发演进(JDK7 Segment 分段锁→JDK8 CAS+synchronized)+size 的弱一致(CounterCell 分散计数)——collections 15/19 题的完整版。

1. JDK 7 Segment:默认 16 段,每段一把 ReentrantLock——并发度=段数(16);JDK 8:取消 Segment,桶空=CAS 插入(casTabAt),桶非空=synchronized(锁链头 Node)——并发度=桶数(更细粒度)。
2. size 的弱一致:CounterCell 分散计数(baseCount+多个 cell,线程绑 cell)→size=遍历求和(无锁快照)——求和瞬间 cell 可能未并入(弱一致,第 19 题 collections);精确控制用 Semaphore/AtomicLong(不是 CHM.size)。
3. 扩容:多线程协助扩容(helpTransfer——ForwardingNode 标记已迁移桶,写线程遇到则协助搬移)——扩容与读写并行(CHM 的独特能力,HashMap 扩容阻塞读写)。

## 参考分析

### 机制:Segment→CAS+synchronized 的演进原因

JDK 7 的 Segment 粒度粗(16 段,每段一把锁)——并发度上限 16;JDK 8 的桶级锁:锁粒度=单桶(不同桶并行)+空桶 CAS(无锁插入)——并发度=桶数(更细粒度且消除段结构)。演进的本质=锁粒度从"段"细化到"桶"。

### 反例:CHM 的两种事故

事故一:computeIfAbsent 函数内递归修改同 map——IllegalStateException/死锁;修复=函数内不改同 map(先 putIfAbsent 占位再异步完成,第 17 题 collections)。事故二:函数内长 IO——桶头锁被占,同桶操作全部阻塞(第 17 题 collections);修复=占位+异步完成(putIfAbsent(key, future) 模式)。

### 取舍:CHM vs HashMap vs synchronizedMap

CHM:并发读写(读无锁+写桶锁)——读多写多首选;HashMap:单线程/局部;Collections.synchronizedMap:全表锁(串行化,第 2 题 collections)——性能:CHM 91ms vs synchronizedMap 233ms(本机 C2 实测,2.5 倍差距)——判据一句话:并发读写选 CHM。

## 案例

### 验证:CHM 的走查核对

验证:本机 C2 实验(8 线程 40 万 ops,CHM 91ms vs synchronizedMap 233ms);C4 实验(树化轨迹:16→32→64 才树化);弱一致(C19:size 限流穿透——105 并发请求全通过);原子 API(C15:putIfAbsent 并发只执行一次加载)。验证:并发吞吐/原子性/弱一致断言可程序化。

### 追问链:CHM 三刀

一刀:"CHM 的 null 键值?"——不允许(null 在并发下歧义:不存在还是值为 null);修复=哨兵对象或 Optional(第 18 题 collections)。二刀:"CHM 的迭代器?"——弱一致(不抛 CME,反映创建时或之后的部分更新)——遍历统计要容忍弱一致(第 19 题)。三刀:"CHM 的树化?"——同 HashMap(链 8+桶 64)——并发下的树化由桶头锁保护(第 4 题 collections 的树化追问)。

## 总结点

1. JDK7 Segment→JDK8 桶级锁
2. size 弱一致,精确用 Semaphore
3. 扩容与读写并行(helpTransfer)
