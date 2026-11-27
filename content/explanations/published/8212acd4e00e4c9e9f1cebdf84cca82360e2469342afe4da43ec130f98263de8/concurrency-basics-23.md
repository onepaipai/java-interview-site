<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：库存服务需要在等待锁时给用户"忙则稍后再试"的响应，并要求锁等待可中断、读多写少场景另配读写锁。对照 synchronized 与 ReentrantLock 在 tryLock、公平性、可中断与多条件队列上的差异。

1. ReentrantLock 提供 tryLock 立即或限时获取（synchronized 会无限期阻塞）、可中断获取 lockInterruptibly、公平模式与多个 Condition 精准唤醒。
2. 它还支持重入计数与 HoldCount 查询，配合显式 lock/unlock 把锁的边界写得更清楚，代价是必须 finally 解锁、代码更啰嗦。
3. synchronized 在 Java 6 之后经偏向锁、轻量级锁等优化（JEP 374 在 JDK 15 弃用并默认禁用偏向锁后，默认从无锁直接到轻量级），多数场景性能相当；选择依据是"需要哪些控制能力"，不是"哪个更快"。

## 参考分析

### 第二步扩展① 机制：同一互斥语义，不同的控制面板

- 两者都是可重入互斥锁，但底层实现不同：synchronized 走 JVM 内置 ObjectMonitor（C++ 实现，monitor enter/exit 字节码），ReentrantLock 基于 AQS（Java 层 CLH 变体队列）。
- 锁升级方面，synchronized 经历偏向锁（JDK 15 弃用并默认禁用，命令行仍可开启）→轻量级锁（CAS 自旋+Lock Record）→重量级锁（ObjectMonitor，park/unpark），升级不可逆。
- ReentrantLock 无升级链，直接走 AQS 的 CAS+CLH 队列。
- ReentrantLock 像手动挡：tryLock 是"先看看能不能停进去"，lockInterruptibly 是"排队时可以接电话（响应中断）"，公平模式是"严格取号"，Condition 是"按业务分多条等待队列"。
- synchronized 是自动挡：简洁、不易漏解锁（作用域结束自动释放），但没有这些面板。

### 第二步扩展② 反例：把 tryLock 当万能优化

- 为"避免死锁"给所有路径加 tryLock 失败重试，可能把偶发竞争放大成活锁：双方反复抢、反复退、谁也进不去。
- 正确用法是冲突 rare 且重试有退避。
- 或按固定顺序取多把锁从根上避免死锁。
- 另一个误用是 tryLock 成功后忘记 unlock（没有 finally），锁永久泄漏——显式锁的自由伴随纪律。

### 第二步扩展③ 取舍：默认 synchronized，特殊需求升级

- 简单互斥、临界区短、无需超时——synchronized，语法保证解锁。
- 需要以下任一才换 ReentrantLock：限时获取、可中断等待、公平排队、多 Condition、锁诊断（getQueuedThreads 等）。
- 读写锁是另一个维度：读多写少且临界区较长时 ReadWriteLock 或 StampedLock 提升读并行，但复杂度与误用面也随之增加（见第 25 题）。

## 案例

### 第三步发散·验证与推演 对照操作：忙则速返与可中断等待

- 教学验证：线程 A 持锁 2 秒。
- 线程 B 用 tryLock(500,ms) 记录"稍后再试"响应，synchronized 对照组则阻塞满 2 秒。
- 再测 B 在 lockInterruptibly 排队时被 interrupt，预期立即抛 InterruptedException 恢复执行，synchronized 排队中不可中断。
- 代码可复跑，时序清晰，是讲清差异的最短实验。

### 第三步发散·追问① 追问：公平锁的性能差在哪里

- 公平模式维护严格 FIFO，每次释放都要唤醒队首并抑制插队，上下文切换与延迟都更高，吞吐通常明显低于非公平。
- 它的价值是可预测的等待顺序（避免饥饿），适合对时序公平有要求的场景。
- 多数服务宁可接受非公平的偶发插队换吞吐。

## 总结点

1. 默认自动挡，要控制再手动
2. tryLock 是选择权，不是提速器
3. 显式锁配 finally，缺一不可
