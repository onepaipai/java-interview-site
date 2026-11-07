<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/AtomicLong.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：128 个线程对单个 AtomicLong 累加，同时对照组用 LongAdder。观测 CAS 失败重试造成的空转与缓存行竞争，比较两种实现在高争用计数下的 CPU 占用与吞吐。

1. CAS 是乐观并发：失败不排队而是重试，争用越高失败率越高，重试循环本身就在消耗 CPU 与内存带宽。
2. 单个原子变量是所有线程共享的缓存行，每次 CAS 都要在核间夺取独占权（缓存一致性流量），读改写没有合并。
3. LongAdder 把一个计数拆成多个 Cell 分散竞争，汇总时再求和；高争用写多场景显著省 CPU，代价是读到的瞬时值不是精确一口价。

## 参考分析

### 机制：乐观重试是"再试一次"而非"排队等"

CAS 类比多人同时抢一台自助咖啡机的预约屏：失败者不拿号排队，而是立刻回头再抢。人少时这比排队快（无上下文切换），人一多，绝大多数努力都浪费在"抢而不得"上，屏幕（缓存行）本身成为瓶颈。硬件层面每次 CAS 需要把该缓存行置为独占（如 x86 的 lock 前缀指令），核间一致性报文来回就是开销。

### 边界：低争用 CAS 仍然便宜

无争用或低争用时 CAS 通常一次成功，没有系统调用也没有挂起唤醒，比锁快。原子类不适合保护多变量一致性或复杂不变式——CAS 只保证单个变量的一次读改写原子，组合逻辑要么循环重算，要么换锁。把"用了原子类"当成"线程安全解决了"，会漏掉复合操作的竞态。

### 取舍：计数选 Adder，状态选 Atomic

统计类（QPS 计数、指标累加）写多读少，LongAdder 的分片写几乎线性扩展；需要"读到确切当前值再做决定"（如限流阈值判断、引用替换）时用 AtomicLong/AtomicReference 的 CAS 语义。Javadoc 对这个边界写得明确：Adder 牺牲精确瞬时值换写吞吐。监控报表可接受分片汇总，限流决策不行。

## 案例

### 对照操作：单变量争用的 CPU 对比

教学验证：128 线程各累加 100 万次，分别用 AtomicLong.incrementAndGet 与 LongAdder.increment，记录墙钟时间与进程 CPU 时间（可用 ThreadMXBean 或操作系统工具）。预期 AtomicLong 版本耗时与 CPU 明显更高且随线程数恶化，LongAdder 接近线性。实验可在任意多核 Java 17 环境复跑；具体倍数依硬件不同，趋势稳定。

### 追问：CAS 的 ABA 在计数场景要担心吗

纯计数只关心数值不关心历史，ABA 无害。需要"值没变过"以外还要求"中间没发生过任何变化"的语义（如无锁栈的节点复用）才需要版本化：AtomicStampedReference 带戳记。把 ABA 警告无差别套在所有 CAS 上，会导致不必要的复杂化，边界是"对象引用是否会被复用"。

## 总结点

1. CAS 是抢，不是排
2. 争用越高，重试越贵
3. 计数分片，决策才用原子
