<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.State.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银并发沙盘:一个 JVM 进程内跑数百业务线程——进程(资源分配单位,独立地址空间)与线程(调度执行单位,共享进程内存)的边界;Java 线程六状态。

1. 进程:操作系统资源分配的基本单位——独立地址空间/文件句柄/信号处理;进程间隔离(一个崩溃不影响其他)。线程:CPU 调度的基本单位——共享进程的堆/方法区,私有栈/程序计数器——线程切换成本低于进程切换(不换地址空间,缓存更友好)。
2. Java 六状态:NEW(未 start)/RUNNABLE(可运行,含等待 CPU 与 IO)/BLOCKED(等 monitor 锁)/WAITING(无限等待:wait/join/park)/TIMED_WAITING(限时等待)/TERMINATED(结束);迁移由 synchronized/wait/notify/join 触发。
3. 对应关系:Java 线程映射到内核线程(JDK8+ 各平台 1:1,BLOCKED/WAITING 在 OS 层可能挂起);RUNNABLE 在 OS 层可能是 running 或 ready——Java 状态是 JVM 视角,不等于 OS 调度状态。

## 参考分析

### 第二步扩展① 机制:BLOCKED 与 WAITING 的分界

- BLOCKED=synchronized 竞争锁(锁释放自动唤醒,OS 层重量级锁挂起)。
- WAITING=主动进入(wait/join/park),必须被 notify/notifyAll/unpark/目标线程结束唤醒——被动等锁与主动等待的分界。
- 第 20 题展开 wait/notify 语义。

### 第二步扩展② 反例:状态误判的两种事故

- 事故一:把 RUNNABLE 等同于正在跑 CPU——网络 IO 阻塞时线程也是 RUNNABLE(Java 视角),CPU 利用率却低。
- 诊断要看 OS 层线程状态(top -H/jstack)。
- 事故二:线程池任务卡死但状态 WAITING——jstack 看栈顶(park 在 LockSupport→查锁。
- wait→查 notify 配对)。

### 第二步扩展③ 取舍:线程的创建成本与虚拟线程

- 线程创建成本高(默认 1MB 栈预留+内核调度体)——数量受内存与上下文切换约束(JDK17 实测 2 万线程建完 2s,并发基础 11 题)。
- 海量并发任务→线程池复用(第 23 题)或虚拟线程(JDK21,挂起零内核切换)。

## 案例

### 第三步发散·验证与推演 验证:线程状态的实测走查

- 验证:状态断言(未 start→NEW。
- start 后 run 中→RUNNABLE。
- synchronized 竞争→BLOCKED。
- wait→WAITING。
- sleep(100)→TIMED_WAITING。
- run 返回→TERMINATED——六态全覆盖,线程状态实验已在并发模块验证可复跑)。
- jstack 断言(池中空闲 worker=WAITING park)。
- 预期:六态断言与 Thread.State 枚举一一对应。

### 第三步发散·发散要点 追问链:线程三刀

- **追问①·守护线程**：setDaemon(true),JVM 退出不等守护线程——GC/清理类后台任务用,业务别用(随时被杀)
- **追问②·线程优先级**：仅提示(1-10,OS 可忽略),别依赖优先级做正确性
- **追问③·Thread.yield**：建议让步不保证——正确性绝不能建立在 yield/priority 上

## 总结点

1. 进程=资源单位,线程=调度单位
2. 六状态:NEW/RUNNABLE/BLOCKED/WAITING/TIMED/TERMINATED
3. BLOCKED 被动等锁,WAITING 主动等待
