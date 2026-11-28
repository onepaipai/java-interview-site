<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jfr.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账引擎沙盘:CPU 打到 90% 但吞吐上不去,是算力不足还是在等锁等 IO?给出用执行采样、线程状态与等待事件三类证据做瓶颈归因的方法,并交代采样证据的适用边界。

1. 先分桶再深挖:on-CPU 热点(执行采样栈)与 off-CPU 等待(锁/IO/park 事件)是两本账,把时间花在哪里先分清。
2. 执行采样看自占用:栈顶帧频次代表"谁在烧 CPU";等待事件看阻塞对象与持有者,两者互斥覆盖线程时间。
3. 采样有偏,结论要交叉:采样间隔 miss 短任务、平台能力差异(本机 Windows 执行采样为 0)都要交叉验证,不能单源定案。

## 参考分析

### 第二步扩展① 机制:on-CPU 与 off-CPU 的证据形态

- CPU 瓶颈:ExecutionSample 的栈顶集中在少数业务帧(如解析、正则、序列化),CPU 监控与采样栈对齐。
- 等待瓶颈:栈顶稀薄而 jdk.JavaMonitorEnter、jdk.ThreadPark、SocketRead 事件频发,时间花在等。
- 归因流程:按线程状态聚合采样(横轴时间、纵轴线程),CPU 段配栈、等待段配事件,再按热点排序。
- 本机实验里 Windows 执行采样不可用,等待类事件(ThreadPark/JavaMonitorWait)依旧可用——分桶思路不依赖单一事件源。

### 第二步扩展② 反例:被"高 CPU"误导的等待瓶颈

- 对账引擎 CPU 90%,直觉结论"算力不足",加机器无效。
- 真因:大批量记录在同一把锁下串行,等待线程自旋在 CAS 上烧 CPU——CPU 高是等待的副产物。
- 判别要点:执行采样栈顶若是 CAS/自旋帧而非业务算法帧,配 JavaMonitorEnter 事件的持有者,就是锁热点伪装成 CPU 热点。
- 修正:拆锁/降并发粒度,CPU 与吞吐同时改善,加机器只会养肥问题。

### 第二步扩展③ 取舍:剖析工具的三层配置

- 常开层:JFR default 档(低成本时间线)。
- 诊断层:JFR profile 档短录(执行采样加等待事件)。
- 深潜层:perf/async-profiler 类工具拿火焰图(Linux 生态,Windows 受限)。
- 结论规则:任何单层证据不下"瓶颈"结论,至少两层交叉(采样栈+事件/监控指标+业务吞吐)。
- 本机实践证明平台差异真实存在,工具链要提前在目标 OS 验证过。

## 案例

### 第三步发散·验证与推演 实证:一次可用的分桶数据

- 本机(Java 17.0.17,probe2.jfr,profile 档 8 秒,负载 MixedExp2):
```
jdk.ObjectAllocationSample 120  (分配侧证据可用)
jdk.ExecutionSample 0            (CPU 侧采样缺失)
jdk.JavaMonitorWait 1 / ThreadPark 0
```
- 验证与结论:分配密集负载被 ObjectAllocationSample 完整记录,等待事件近零——可判"非锁等待,瓶颈在分配与回收侧"。
- CPU 侧证据缺失标明该环境下需补 perf 类工具。
- 分桶方法在这种残缺证据下依然给出了方向。

### 第三步发散·追问扩展 追问链:瓶颈归因三刀

- **Q1：采样间隔设多细?**
  - 答：profile 档默认 10ms 执行采样、分配按大小采样;过细的开销上升且偏差结构不变,通常不动默认值。
- **Q2：怎么确认不是采样盲区?**
  - 答：换证据源:jstack 连拍(每秒 5 张)人工聚合,与 JFR 分布对比;两者一致才收案。
- **Q3：GC 线程的 CPU 算谁的?**
  - 答：容器里 GC 并发线程与应用共享 quota,采样栈会看到 GC 帧;归因时把 GC 期间的应用变慢单独拆开(对齐 GC 时间戳),避免把回收成本算到业务头上。

## 总结点

1. 先分桶,后深挖,互斥才完整
2. 栈顶找烧 CPU 的,事件找等的
3. 单源不下结论,交叉才定案
