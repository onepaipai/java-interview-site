<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：同一个计数服务里同时存在 synchronized 实例方法、synchronized static 方法与 synchronized(this) 块。用两组线程分别并发调用不同方法，推演哪些组合互斥、哪些完全不互斥。

1. 实例方法锁的是当前对象，保护该对象的实例状态；静态方法锁的是 Class 对象，保护静态全局状态。
2. 两种锁互不互斥：持实例锁的线程与持 Class 锁的线程可以同时进入，混用两者保护同一份状态就是竞态。
3. Class 锁是进程级单点，把本不冲突的请求串行化，比实例锁更容易成为瓶颈；需要全局互斥时也应显式命名并控制范围。

## 参考分析

### 机制：两把不同的锁，守着两个不同的房间

实例锁类比每间包厢的门锁：对象不同互不影响，适合保护 order.items 这类每单一份的状态。Class 锁类比整栋楼唯一的大门闸机：static 字段、缓存、注册表这类进程只有一份的状态才需要它。synchronized 实例方法对应 synchronized(this)，synchronized static 方法对应 synchronized(XxxClass.class)，这是语法糖背后的两把实体锁。

### 反例：一半加实例锁、一半加 Class 锁

常见事故是 increment 用 synchronized 实例方法、reset 用 synchronized static 方法：两个线程可同时进入，计数照样错。锁对象不同，互斥根本没建立。另一种反方向的问题是该用实例锁却用了 Class 锁：每个请求都要路过同一个闸机，吞吐被压平，而且其他无关代码若也锁这个 Class，等待会连带放大。

### 取舍：缩小临界区，优先实例状态

优先把状态放进实例、用实例锁；确实需要全局状态时，考虑 AtomicLong、ConcurrentHashMap 等并发容器，或在应用层按 key 分片降低 Class 锁竞争。锁定 Class 的代码要注释清楚"这是全局锁"，避免他人误加 synchronized(this) 后以为受到了保护。跨实例部署时，JVM 内的任何锁都不构成分布式互斥，需外部协调。

### 底座：锁信息存在对象头的 Mark Word 里

两把锁的物理载体是对象头 Mark Word 中的锁标志位：实例锁记录在该对象自己的 Mark Word，Class 锁记录在 Class 对象的 Mark Word——对象与它的类各有一份头，互不相干，这就是"两把实体锁"的根源。字节码层面，synchronized 块编译为 monitor enter/exit 两条指令，方法则由 ACC_SYNCHRONIZED 标志标记，进入时 JVM 按锁状态走对应路径。轻量级阶段锁状态直接写在 Mark Word 里；膨胀为重量级后，Mark Word 指向堆上的 ObjectMonitor（含 owner、入口队列 EntryList、等待队列 WaitSet）。面试追问"锁存在哪"答到 Mark Word 与 ObjectMonitor 即闭环。

## 案例

### 对照操作：三种组合的互斥矩阵

教学推演矩阵：实例方法对实例方法（同一对象互斥、不同对象并行）；static 对 static（互斥）；实例方法对 static（不互斥）。验证可在每个方法入口记录进入时间戳并短暂休眠，断言同对象实例调用串行、实例与 static 调用重叠；预期矩阵与 JLS 中监视器锁规则一致，属规范结论，示例代码可复跑。

### 追问：synchronized(this) 与 synchronized 方法选哪个

synchronized(this) 能把大方法拆成小临界区、并允许同方法内不同代码用不同锁对象；公开 this 作锁的风险是外部代码也能 synchronized(你的对象)，造成无法分析的阻塞，因此更推荐私有 final 锁对象。synchronized 方法胜在简洁、可直接在字节码层面看到监视器边界，简单场景不必刻意改造。

## 总结点

1. 实例锁守对象，Class 锁守全局
2. 两把锁互不通融，混用必竞态
3. 全局锁是闸机，能不用就不用
