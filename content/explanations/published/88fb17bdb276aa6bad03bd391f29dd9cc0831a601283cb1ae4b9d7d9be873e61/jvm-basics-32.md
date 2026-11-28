<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：突发流量下服务抛 "unable to create new native thread" 后整个进程不可用。拆解线程创建的资源链（栈内存、内核线程、系统限额），说明为什么与 Xmx 无关。

1. 每个 Java 线程对应一个内核线程并预占栈内存（Xss 默认约 1MB）：千线程即 GB 级本地内存预留，外加内核侧的调度与页表开销。
2. 创建失败的三道闸：进程地址空间/RSS 预算（容器 cgroup 更紧）、系统与容器限额（ulimit -u、pids.max）、内核线程数上限——任何一道拒绝即抛 unable to create native thread。
3. 它常是设计问题的终末症状：无界线程池（Executors.newCachedThreadPool）、每请求一线程、递归开线程——限流与池化才是正解（见第 48 题预算拆分）。

## 参考分析

### 第二步扩展① 机制：线程是三层资源的联合账单

- new Thread 要同时向三层交钱：JVM 层预占栈内存、OS 层建内核线程（调度实体+内核栈）、配额层扣线程名额。
- 类比开新工位：办公室要有工位（地址空间）、人事要批编制（ulimit）、园区还要有门禁名额（cgroup pids）——任何一层拒批，人都进不来。

### 第二步扩展② 故障推演：突发流量下的连锁崩塌

- CachedThreadPool 在流量尖峰无限扩容：线程数冲破 pids.max → 新请求抛 unable to create native thread → 上游重试加剧并发 → 已有线程全在等下游，进程既不能服务也无法自救。
- 虚线程（JDK 21 起）为此而生，但 Java 17 的正解是:有界池 + 队列 + 拒绝策略（见并发模块第 17 题）。

### 第二步扩展③ 取舍：线程预算的算术

- 可用线程数 ≈ min(内存预算 ÷ Xss, 系统限额)。
- 按 512MB 线程预算、512KB 栈算上限 1024。
- 再扣 GC/JIT/框架自身线程。
- 需要更高并发且负载是 IO 型时，Java 17 内的选择是 NIO/异步（CompletableFuture 编排）或压缩 Xss，升级虚拟线程属于 JDK 21+ 的路线图。

## 案例

### 第三步发散·验证与推演 对照操作：限额触发的复现

- 教学验证：容器内以 pids.max=256 与默认 Xss 循环创建线程。
- 预期：创建到限额附近抛 unable to create native thread，错误与堆内存无关。
- 改小 Xss 后线程数上限上升但栈变浅。
- 实验可复跑，直观呈现"三层账单"各自的作用点。

### 第三步发散·追问① 追问：虚拟线程为什么能绕开这道墙

- 虚拟线程的栈在堆上按需伸缩、挂起时不占用内核线程，百万级并发不再绑定内核资源——但它 Java 21 才转正，Java 17 只能用平台线程池。
- 讨论时说清版本边界，避免把未来能力当成当前方案。

## 总结点

1. 线程三层账：栈、内核、配额
2. 无界池是终末症状的源头
3. 预算 ÷ Xss = 上限
