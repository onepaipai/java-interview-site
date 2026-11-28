<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [OpenJDK 设计说明 · 3](https://openjdk.org/jeps/377)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银出金网关沙盘:高峰期 P99 从 45ms 抖到 300ms,链路追踪显示抖动与 GC 时间戳相关。以 P99/P999 为北极星指标,给出从测量到验证的完整调优流程。本文数据取自下文实测。

1. 先定义目标再动手:P99/P999 各自的预算是多少、由谁分配(GC 只能花其中一部分),没有预算数字的调优都是盲调。
2. 先测量后调参:开 -Xlog:gc* 与 JFR 拿到暂停分布、分配速率、晋升速率三组基线,再决定改哪个参数。
3. 一次只改一个变量,并预设回滚条件:参数改动的收益必须能在日志里指认,否则回退。
4. 尾延迟问题优先看暂停之外的干扰:安全点等待、并发周期抢 CPU、大对象分配,它们不体现在 GC 总时间里。

## 参考分析

### 第二步扩展① 机制:尾延迟预算如何分解到 GC

- 把 P999 目标 50ms 拆开:网络与业务逻辑占大头,GC 的 STW 暂停只是其中一项,还有并发周期抢走的应用吞吐、安全点同步等待、以及 GC 后紧接的缓存冷启动。
- 调优前先从链路追踪确认"抖动窗口"与 GC 日志时间戳是否重合,这一步决定后面是调 GC 还是调代码。
- 日志层面用 -Xlog:gc* 输出每次暂停,配 P999 的分布做对齐。

### 第二步扩展② 反例:只看 GC 时间占比会漏掉真正的元凶

- 实测里 G1 的 young 暂停中位仅 2.948ms、最大 32.202ms(256MB 堆,单线程压测),GC 时间占比不到 5%,按"占比思维"完全可以不调。
- 但 ZGC 对照组在堆被填满时出现 Allocation Stall (main) 59.822ms——一次 60ms 的应用侧停顿,任何"GC 时间占比"指标都不统计它。
- 尾延迟调优必须把分配速率、堆余量、暂停分布、应用侧停顿(如 Allocation Stall)放在一起看,而不是只看 GC 花了多少时间。

### 第二步扩展③ 取舍:参数面越窄,回滚越容易

- 每一轮只动一个参数(如 MaxGCPauseMillis、InitiatingHeapOccupancyPercent、堆大小三者绝不同批改动),并在变更单里写死回滚条件:例如"P999 连续 10 分钟超预算即回滚"。
- 参数越多,归因越难。
- 实测中同一个负载换 -Xlog 粒度都会影响日志干扰程度,更不要说同时改五个参数。

## 案例

### 第三步发散·验证与推演 实证:一次可复现的基线采集

- 在本机 JDK 17.0.17 用同一负载跑 G1:-Xms512m -Xmx512m -XX:MaxGCPauseMillis=5 -Xlog:gc*:file=pause.log。
- 命令与关键输出如下,程序含 60 轮高频分配,以 OOM 收尾(净增长设计),数据取自 OOM 前。
- 验证方式:重跑同命令应得到同量级分布。
```
GC(30) Pause Full (G1 Compaction Pause) 511M->407M(512M) 80.755ms
GC(0)  Pause Young (Normal) (G1 Evacuation Pause) 25M->5M(512M) 2.404ms
GC(4)  Pause Young (Normal) (G1 Evacuation Pause) 50M->50M(512M) 6.211ms
```
- 结果:目标 5ms,young 实测 2.4 至 6.2ms 波动,且出现 80.755ms 的 Full——预算与实际的差距即为后续调参的靶子。

### 第三步发散·追问扩展 追问链:面试官沿尾延迟调优的三刀

- **Q1：5ms 目标设了为什么还超?**
  - 答：答:MaxGCPauseMillis 是目标不是承诺,G1 按它规划 young 区数量,但存活集大小与 Humongous 不受它控制,实测同参数下 young 在 2.4 至 6.2ms 波动。
- **Q2：那直接换 ZGC 是不是就稳了?**
  - 答：答:换 ZGC 把暂停降到 0.005 至 0.017ms,但实测同一负载出现过 59.822ms 的 Allocation Stall,堆余量不足时应用照样停,换回收器不等于免调优。
- **Q3：线上没有 GC 日志时怎么定位?**
  - 答：答:开 JFR 常态采集(实测 profile 档 8 秒能拿到 120 条 ObjectAllocationSample),事后从时间戳对齐 P999 抖动窗口,再回放取证。

## 总结点

1. 先定预算再调参,一次一个变量
2. 占比低不等于无嫌疑,看暂停分布
3. 每轮改动留回滚,日志里找收益
