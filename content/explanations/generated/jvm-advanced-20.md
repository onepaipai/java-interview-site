<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银核心沙盘:容器 CPU limit 设 4 核,高峰期 GC 暂停时间比裸机翻倍,接口 P99 同步劣化。解释 CFS 限流如何同时打击应用线程与 GC 线程,以及容量评估中的误区。

1. 限流是按窗口扣预算:CFS quota 用尽时容器内所有线程(业务线程与 GC 线程)一起被暂停到下个窗口,GC 线程变慢,暂停被拉长。
2. 并发 GC 把"GC 线程"变成"业务的一部分":标记/搬迁抢不到 CPU,周期拉长,更晚进入 young 回收,暂停与分配曲线互相恶化。
3. 容量评估要按"限流后的有效核数"算:cpu.max 的 quota/period 与实际使用率的监控口径不同,超卖比和突发窗口都要校准。

## 参考分析

### 第二步扩展① 机制:CFS 窗口如何同时惩罚两类线程

- 内核按 period(如 100ms)给容器 quota(如 400ms/4 核)。
- 多线程应用在窗口内把 quota 提前用完,剩余窗口全容器暂停(throttled)。
- GC 并发线程与应用共享同一个 quota 池:窗口耗尽时,G1 的并发标记线程同样被挂起,Concurrent Mark Cycle 被拉长。
- 若处于 STW 段,暂停时间随窗口边界延长。
- Linux-only 行为,Windows 本机无法复现,以下为机制推演加生产取证口径。

### 第二步扩展② 反例:"CPU 使用率不高"掩盖的限流

- 监控显示容器 CPU 60% 未告警,但 throttled 时间比例达 30%——使用率是窗口平均,限流发生在窗口尾部的瞬时耗尽。
- 多线程突发(如 GC 并发周期启动、缓存批量加载)把 quota 秒杀,平均数看不出来。
- 取证要取 cgroup 的 cpu.stat 里 nr_throttled/throttled_time,与 GC 暂停时间戳对齐。
- 只看平均 CPU 的告警体系在限流场景下是盲的。

### 第二步扩展③ 取舍:limit、突发与 GC 线程的配平

- 三个方向:limit 提升或改用静态绑核消除突发耗尽。
- CPU limit 预留 GC 并发份额(ConcGCThreads 数量按有效核数折算)。
- 应用侧削峰(批处理错峰、连接数限流)。
- 不要用"压低 GC 线程优先级"解决——CFS 没有容器内优先级契约,权重调参效果不稳定。
- 容量压测必须带 limit 运行,裸机压测结论不可迁移。

## 案例

### 第三步发散·验证与推演 推演:取证口径与关联分析(机制推演,附本机对照锚点)

- 取证步骤:cpu.stat 取 throttled 比例,GC 日志取暂停与并发周期时长,对齐时间窗口。
- 若暂停尖刺与 throttle 窗口重合即定案。
- 本机对照锚点(无限流环境):并发标记周期实测 195.485ms、暂停最大 32.202ms——这些数字在限流容器里会系统性变长。
- 给同一负载加 limit 前后对照即可量化(待在 Linux 容器环境补测,标注)。
- 验证判据:throttled 归零后暂停分布应回到裸机量级。

### 第三步发散·发散要点 追问链:限流三刀

- **追问①**："为什么暂停也会变长?STW 不是不走调度吗?"——STW 的进入需要所有线程到达安全点,被限流的线程到不了,同步等待被拉长;STW 期间的压缩工作本身也要 CPU
- **追问②**："那 GC 线程该给几个?"——按限流后有效核数配 ConcGCThreads,别按物理核;容器里 Runtime.availableProcessors 已感知 cgroup(UseContainerSupport 默认开),但配额抖动时仍要人工校准
- **追问③**："和 NUMA/大页什么关系?"——限流放大了内存访问延迟的权重,NUMA 本地性差的容器在限流时更疼(见第 44 题),容量规划要把两者一起看

## 总结点

1. 窗口扣预算,全体一起停
2. GC 线程也吃 quota,周期先变长
3. 看 throttled 不看均值,压测要带 limit
