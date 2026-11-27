<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ArrayBlockingQueue.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银任务队列沙盘:同容量同负载——ArrayBlockingQueue(ABQ)单锁较高吞吐,LinkedBlockingQueue(LBQ)双锁(读写分离)更高吞吐但内存动态增长。用锁结构与内存特征说明选型。

1. 锁结构:ABQ 一把锁(读写共用,put/take 互斥);LBQ 两把锁(putLock/takeLock 分离——生产与消费并行)——LBQ 的并发吞吐更高(读写不互相阻塞)。
2. 内存特征:ABQ 预分配数组(容量固定,内存确定,无节点分配);LBQ 链表节点(每元素一个 Node 对象——分配与 GC 压力,但容量上限可选[默认 Integer.MAX 无界!])。
3. 选型:需要确定内存/背压严格→ABQ(容量硬约束);生产消费并行度高→LBQ(双锁吞吐);两个都要→ABQ+足够容量或 MPSC 变体——默认 ABQ(确定性优先)。

## 参考分析

### 第二步扩展① 机制:单锁与双锁的吞吐差异

- ABQ:put 与 take 竞争同一 ReentrantLock(两个 condition notFull/notEmpty)——生产者与消费者互斥(但队列操作本身极快,竞争窗口小)。
- LBQ:putLock(生产)+takeLock(消费)分离——生产消费完全并行(头尾分离的链表)。
- 吞吐实测画像:高并发下 LBQ 通常胜 ABQ(双锁)。
- 低并发差异小。
- GC:ABQ 零节点分配(数组复用)。
- LBQ 每元素 Node(高频场景 GC 压力)。

### 第二步扩展② 反例:LBQ 无界的默认陷阱

- 陷阱:new LinkedBlockingQueue()(无参)——容量 Integer.MAX_VALUE(无界)——消费慢时堆积到 OOM(第 23 题无界队列同构)——Executors.newFixedThreadPool 内部正是它。
- 修复:显式容量(new LinkedBlockingQueue<>(N))——容量是背压的前提(第 23 题)。
- 或 ABQ(容量强制)。
- 无界 LBQ 只在"上游天然有界"时合法(调用方已限流)。

### 第二步扩展③ 取舍:队列的进阶变体

- 变体:ABQ 的公平模式(锁公平——吞吐降但无饥饿)、LBQ 的容量上限(双锁+有界)、MpscArrayQueue(JCTools,多生产者单消费者——极致吞吐的 Netty 场景)、Disruptor(环形缓冲+无锁——延迟敏感的顶级方案)。
- 选型阶梯:ABQ(默认)→LBQ 有界(并行需求)→JCTools/Disruptor(极限性能,引入第三方库的成本评估,第 17 题)。

## 案例

### 第三步发散·验证与推演 验证:吞吐与内存的断言组

- 验证:吞吐对照(同容量同负载:ABQ vs LBQ 的 ops/s——双锁的收益数据)。
- 内存断言(ABQ 预分配 vs LBQ 节点分配——GC 统计对照)。
- 无界陷阱断言(LBQ 无参构造的堆积复现)——三组数据进队列选型指南。

### 第三步发散·追问扩展 追问链:队列选型三刀

- **Q1：容量怎么定?**
  - 答：突发吸收+延迟预算(第 23 题):容量=突发量上限且积压延迟可接受——容量是业务参数。
- **Q2：锁竞争的观测?**
  - 答：队列的锁等待(锁监控)vs 吞吐瓶颈——锁竞争显著时才升级双锁/无锁变体(第 17 题选型判据)。
- **Q3：语义差异?**
  - 答：ABQ 的 put 在满时阻塞(背压);LBQ 有界同;语义一致,差异在实现——选型看实现特征(锁/内存),不背语义。

## 总结点

1. ABQ 一把锁确定内存,LBQ 双锁高吞吐
2. 无界 LBQ 是 OOM 陷阱
3. 极限场景再上无锁变体
