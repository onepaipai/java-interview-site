<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/AtomicBoolean.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：工作线程循环处理队列，外部线程置 running=false 停止。对照三版实现：普通 boolean、volatile boolean、AtomicBoolean，推演 JIT 提升寄存器、可见性与原子性各自的边界。

1. 循环里持续读取的停止标志需要跨线程可见性：volatile 是最小正确改动；普通 boolean 可能被 JIT 提升进寄存器导致循环永不退出。
2. 只需"通知停止"语义时 volatile 足够；若标志还要参与"读改判"（如"已停止就不再开始新事务"的原子判断），需要 AtomicBoolean 的 CAS。
3. 标志只能让循环退出，唤醒阻塞中的线程仍要靠 interrupt；两者组合才是完整停止协议。

## 参考分析

### 第二步扩展① 机制：JIT 的合法优化与可见性契约

- 无同步的读取在单线程视角下语义不变，JIT 可把循环内读取提升为"读一次进寄存器"，外部的写入从此看不见——这是 JMM 允许的数据竞争后果。
- volatile 读写建立 happens-before，每次循环强制从内存层级取最新值。
- 类比公告栏：不加 volatile 等于员工把告示抄在便签上贴工位（寄存器），办公室换了新告示他永远不知道。

### 第二步扩展② 边界：volatile 标志管不到的三件事

- 一，阻塞唤醒：线程睡在 take、wait、socket 读上，改标志不会让它醒来，必须 interrupt。
- 二，复合判断：if (!stopped && quota>0) { startTx()。
- } 的"检查再行动"在并发下有竞态，标志可见不等于判断原子，需要 CAS 或锁。
- 三，状态回退：标志置回 true 恢复运行时，两次翻转之间的交错语义要自己定义，volatile 只保证单次读到的值是发布的。

### 第二步扩展③ 取舍：volatile、Atomic 与线程 interrupt 的组合

- 纯通知用 volatile 最简单。
- 要 compareAndSet（如"确保只有一个停止流程执行"）用 AtomicBoolean。
- 停止协议完整版：置标志（快速路径生效）加 interrupt（唤醒阻塞）加 join（确认退出）加超时（兜底报警）。
- 只做第一步的"停止"在实践中总会在某个阻塞点上失效。

## 案例

### 第三步发散·验证与推演 对照操作：普通标志的"永不退出"复现

- 教学验证：工作线程 while(running) 空转计数，主线程 sleep 后置 false 并 join(1s)。
- 普通 boolean 版本在启用 JIT 的环境下预期超时未退出（概率性，与编译层次相关，多跑几轮或加 -Xcomp 提高命中）。
- volatile 版本稳定退出。
- 再给工作线程加一次 sleep 使其周期性进入阻塞，验证只靠标志停止的线程在阻塞段收不到通知，必须 interrupt。

### 第三步发散·追问① 追问：为什么 AtomicReference 停止标志少用

- 停止标志是单写多读的"通知"，没有 CAS 需求时 AtomicBoolean 的功能用不上。
- 对象引用型的"停止条件"（替换配置快照）才常用 AtomicReference。
- 选型看语义需求：可见性选 volatile，读改写原子选 Atomic，复杂状态机干脆用锁或并发容器。

## 总结点

1. 循环读标志，volatile 是底线
2. 标志管退出，interrupt 管唤醒
3. 检查加行动，原子不能少
