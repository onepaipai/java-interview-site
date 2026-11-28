<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/manage/introduction.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银单账户并发沙盘:无竞争(偏向)→交替(轻量自旋)→激烈(重量 monitor)——Mark Word 记录锁状态,JVM 按竞争烈度逐级升级且只升不降(偏向锁 JDK15 起废弃)。

1. 对象头 Mark Word(64 位 JVM 下 8 字节)存锁状态:无锁(hashCode+分代年龄)/偏向锁(线程 id+epoch)/轻量级(栈上 Lock Record 指针)/重量级(ObjectMonitor 指针)+2 位标志位区分——同一时刻只有一种状态,升级路径:无锁→偏向→轻量→重量(只升不降,GC 撤销除外)。
2. 偏向锁:第一个线程 CAS 写入线程 id——之后同线程进入只比对 id(零成本,无 CAS);另一线程竞争→到达安全点撤销偏向→升级轻量级。轻量级:线程栈 Lock Record+CAS 把 Mark Word 换成指向它的指针——竞争失败自旋(适合持有时间短/交替访问);自旋超过阈值或第三个线程参与→膨胀重量级。
3. 重量级:Monitor(ObjectMonitor,OS mutex)——未抢到的线程挂起(内核态,上下文切换成本)+等待队列;适合持有时间长/竞争激烈的场景;JVM 自适应自旋(根据历史自旋成功率动态调整自旋次数)在轻量与重量之间平衡。

## 参考分析

### 第二步扩展① 机制:为什么逐级升级而不是一步到位

- 锁的实际竞争分布:大多数锁从未竞争(偏向)/短暂交替(轻量自旋就够)/少数激烈(才需要挂起)——升级路径=按需付出成本:偏向=一次 CAS 后零成本,轻量=用户态自旋(不进内核),重量=内核挂起(最贵但适合长持有)。
- 一步到位重量级=把最贵的成本摊给所有锁(浪费)。
- JDK15 废弃偏向锁(JEP 374):维护成本>收益(撤销要安全点,批量重偏向复杂)+现代应用竞争模式变化。

### 第二步扩展② 反例:锁升级的两种事故

- 事故一:hashCode 与偏向锁冲突——无锁对象调 hashCode()(未重写 identity hash)后无法进入偏向(Mark Word 没地方放)→直接轻量级。
- 不需要背细节,需要知道“调用过 hashCode 的对象不会偏向”。
- 事故二:长自旋浪费 CPU——锁持有时间长+轻量自旋——自旋空转烧 CPU(等价忙等)。
- JVM 自适应会及时膨胀,但业务侧修复=缩短临界区或换 ReentrantLock(可中断)。

### 第二步扩展③ 取舍: synchronized vs 显式锁的底层视角

- synchronized 的升级机制使其在无竞争/轻竞争场景接近无锁成本——这是“普通互斥优先 synchronized”的底层依据(第 21 题)。
- ReentrantLock 的优势在语义(tryLock/公平/多 Condition/可中断)而非性能——需要高级语义才用,不为性能换。

## 案例

### 第三步发散·验证与推演 验证:锁行为的实测走查

- 验证:jol(ObjectLayout)打印 Mark Word——无锁→偏向(同线程重入后标志位变化)→另一线程竞争后变轻量(指向 Lock Record)→多线程激烈竞争变重量(指向 monitor)。
- 偏向延迟断言(JVM 启动后 4 秒内偏向未启用——biased locking startup delay)。
- 无竞争吞吐断言(单线程 synchronized 方法≈无同步性能)——锁升级实验已在 JVM 批次验证,本机可复跑。
- 预期:升级路径与竞争烈度一一对应。

### 第三步发散·发散要点 追问链:锁三刀

- **追问①·锁消除**：逃逸分析发现对象未逃逸→JIT 删掉 synchronized(第 27 题同源)
- **追问②·锁粗化**：循环内反复获释同一锁→JIT 合并为一次
- **追问③·替代方案谱系**：CAS 原子类(无锁)/读写锁(读多)/StampedLock(乐观读)/LongAdder(热点计数分桶,第 8 题)——按竞争模式选,不默认

## 总结点

1. Mark Word 记状态,只升不降
2. 偏向零成本,轻量自旋,重量挂起
3. 偏向锁 JDK15 已废弃(JEP 374)
