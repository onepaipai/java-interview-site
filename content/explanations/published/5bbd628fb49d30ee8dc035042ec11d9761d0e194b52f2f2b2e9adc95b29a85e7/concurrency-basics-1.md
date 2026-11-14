<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：配置线程把含开关与限额的配置对象整体替换，多个工作线程循环读取 volatile 引用并做计数累加。观察可见性何时生效，复合计数与多字段读取还有哪些风险。本场景为设计推演，未运行基准。

1. volatile 保证一个线程的写在下一次读中被看到：读写之间建立 happens-before，读到的一定是已发布的最新值，不会用寄存器里的旧副本。
2. 它不保证复合操作原子性：count++ 是读、加、写三步，两个线程交错仍会丢更新，需要 AtomicLong 或加锁。
3. 多个 volatile 字段之间也没有原子性：两次读可能拿到不同版本。要一致快照，就把字段收进一个不可变对象，整体替换 volatile 引用。

## 参考分析

### 机制：写与读配对建立顺序，而不是"实时同步"

JLS 第 17.4 节把可见性定义为 happens-before 顺序：对 volatile 变量的写与后续对它的读同步，读线程能看到该写及它之前未被重排的全部写入。可以类比成公告栏换纸：管理员把一整页新告示贴上去（一次写），路过的人要么看到旧纸、要么看到完整新纸，不会看到半页。但每个人仍要自己凑近看一次（主动读），公告栏不会推送，也不管纸上写的账目算得对不对。

### 边界：不锁、不阻塞、不管复合操作

volatile 不提供互斥，临界区里多个步骤依然可以交错；它也不让线程等待。因此可见性只解决"看到旧值"，不解决"读改写被插队"。另一个常被忽略的点是 long 和 double 的非 volatile 读写理论上是两次 32 位写（JLS 17.7），volatile 化后才是整体读写；在 64 位主流 JVM 上即便不加 volatile 通常也表现为整体写，但这属于实现细节，跨平台代码不能依赖。

### 取舍：快照发布模式的适用与代价

读多写少的配置、路由表、限额参数适合"不可变对象 + volatile 引用整体替换"：读者无锁、写者构造完整新对象后一次发布。代价是每次修改都新建对象，字段很多或更新极频繁时不如加锁或 AtomicReference 的 CAS 更新。把多个 volatile 字段当作"各自独立的通知通道"来用是允许的，前提是业务不要求它们在同一时刻互相一致。

## 案例

### 对照操作：丢更新用 AtomicInteger 才消除

教学验证定义 volatile int count，两个线程各执行 1000 次 count++，join 后统计；再改用 AtomicInteger.incrementAndGet 重复同一实验。预期 volatile 版本结果小于 2000 且每次运行不同（丢更新），原子版本恒等于 2000。此实验代码简单，可在任意 Java 17 环境复跑；不同硬件上 volatile 版本的差值会不同，不能把某次差值当作固定损耗。

### 追问：停止标志为何能生效，阻塞 IO 为何不响应

运行线程每轮循环读一次 volatile boolean running，写线程置 false 后它会在下一轮退出，这靠的就是写读同步；若把标志改成普通 boolean，JIT 可能把它提升进寄存器导致循环不退出。边界要讲清：线程若正阻塞在 socket 读或 Object.wait 上，改标志不会唤醒它，需要中断或关闭流，可见性不等于唤醒能力。

## 总结点

1. 可见不原子，快照整体换
2. 复合操作交给原子类或锁
3. 公告栏不推送，主动读才可见
