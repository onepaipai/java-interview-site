<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [OpenJDK 设计说明 · 1](https://openjdk.org/jeps/374)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html#jls-17.1)

</details>

## 参考回答

1. synchronized 的监视器优化属于 JVM 实现，不能把历史锁状态图当作跨版本规范。
2. Java 17 默认已禁用偏向锁；应结合目标 JDK、竞争和监视器膨胀证据分析。
3. 关注临界区长度和竞争等待，不能把 ReentrantLock 的公平策略套到 synchronized。

## 参考分析

1. 无竞争与竞争路径的实现随 JDK 演进，轻量路径和监视器膨胀并非业务代码可依赖的固定 API。
2. 同一对象监视器发生竞争时，等待线程可能处于 BLOCKED，应结合持有线程和锁对象定位。
3. 限时获取、公平队列和 AQS 是其他控制机制，不是 synchronized 锁升级的验证手段。

## 案例

1. 场景（教学示例）：线程 A 在 synchronized(lock) 内执行慢 I/O，线程 B 进入同一监视器等待。

2. 观测：采集线程转储，核对 B 的 BLOCKED 与等待对象，再找到 A 的持有栈；记录 JDK 版本和相关 JVM 日志。

3. 修复验证：把不必受锁保护的慢操作移出临界区，在相同负载下比较阻塞量和正确性，不凭对象头名称推断性能。

## 总结点

1. 先看 JDK，再看竞争。
2. 缩短临界区，按证据调优。
