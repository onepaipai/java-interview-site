<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银高性能缓冲沙盘:数组实现环形队列(head/tail 指针循环前进)——head==tail 既可能是空也可能是满,必须用第三种信息消歧,否则队列容量少用一格或引入计数。

1. 三种消歧:①牺牲一格——(tail+1)%cap==head 判满,最多存 cap-1 个,实现最简;②计数器 size——判空判满看 size,容量用满,但并发下计数是竞争热点;③代数标记——head/tail 带轮次位,同轮次空/异轮次满(Disruptor 思路变体)。
2. 并发扩展:SPSC(单生产者单消费者)可无锁——head/tail 各归一方写入,volatile 保可见;MPMC 必须 CAS 占位(先 CAS 预占槽位再填内容);锁版最简单但吞吐低。
3. 索引推进规范:前进永远是 index=(index+1)%capacity(或位运算 index&(cap-1),容量 2 的幂)——忘取模=数组越界;容量 2 的幂还能让取模变位运算(HashMap 第 13 题同源思想)。

## 参考分析

### 机制:空满歧义的根源与三条出路

环形队列只有两个指针,n 个状态位却要表达 n+1 种占用状态(0..n)——鸽笼原理注定差一种;三条出路分别牺牲:①牺牲一个槽位(空间换判断)、②引入额外计数(空间换容量)、③编码轮次进指针(把缺失的状态位塞进指针高位)——Disruptor 选择 ③ 还把「槽是否可覆盖」做成独立 availableBuffer,生产者消费者各自只关心自己的游标。

### 反例:环形队列的三种事故

事故一:判满用 tail==head——满与空同判,队列一满就「变空」,元素丢失;事故二:推进忘取模——越界 ArrayIndexOutOfBoundsException,且发生在压测后期(恰好绕回);事故三:SPSC 无锁版把 head 也让生产者写——两个写者无同步,读到的游标错乱;修复=游标所有权严格分离(单写者原则)。

### 取舍:三种方案的选择

单线程/简单场景:①牺牲一格(最短代码);需要满容量:②计数(注意并发时计数与指针的原子性——锁内更新或 AtomicLong);极致吞吐(MQ/网关缓冲):③无锁+轮次标记(Disruptor 每百万级 ops/s 的来源)——复杂度陡增,非瓶颈别写;一般业务直接 ArrayBlockingQueue/MPSC 队列。

## 案例

### 验证:空满断言组(本机可复跑)

验证:满容断言(方案①入队 cap-1 个后判满==true,再 put 被拒;方案②可存满 cap 个);空满歧义断言(head==tail 时刻 size==0 与 size==cap-1 两种状态都可被正确区分);绕回断言(操作 2×cap 次后索引正确回绕、数据无损);SPSC 无锁断言(双线程 100 万 ops 无丢失无重复)。预期:三种方案各自通过自己的判据集。

### 追问链:环形队列三刀

一刀:为什么 Disruptor 快——环形数组预分配(无 GC)+游标单写者+消费者序(多播),对比 LinkedBlockingQueue 的节点分配与两锁(第 5 题关闭语义同一族)。二刀:容量 2 的幂与位运算——(cap-1)&index 等价取模(HashMap 同源)。三刀:RingBuffer 与内存屏障——SPSC 的正确性靠 volatile 写读序(并发基础 2 题 happens-before),错误屏障=可见但不及时或重排导致读旧槽。

## 总结点

1. head==tail 歧义,三法消歧
2. 游标单写者是无锁前提
3. 容量 2 的幂,取模变位运算
