<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jfr.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银订单服务沙盘:卡顿时值班只会 jstack 抓一帧。解释 JFR 的时间线能力(事件流、分配采样、GC 记录、窗口回放)与 jstack 的互补关系,附本机 profile 档实测数据。

1. jstack 是一帧照片,JFR 是行车记录仪:连续低开销记录事件流,事后任意回放,能在没人盯着的时候抓到现场。
2. JFR 独有的四类证据:分配采样(ObjectAllocationSample)、GC 与安全点时间线、锁与 IO 等待、线程池活跃度随时间的曲线。
3. 开销可控可常开:默认 default 档开销约 1%,profile 档约 2%,本机 8 秒 profile 档实测 120 条分配采样;生产建议常开 default,排障临时升档。

## 参考分析

### 机制:JFR 的事件模型与采集面

JFR 以事件为中心:JVM 内建事件(GC、分配、锁、IO、安全点)带时间戳与线程上下文,环形缓冲常驻,崩溃时还能随 hs_err 吐出最近记录。与 jstack 的关系:jstack 给全量线程栈的一帧(适合死锁),JFR 的 ExecutionSample 按固定间隔采样(适合热点),两者不能互替。启动两种:命令行 -XX:StartFlightRecording 与运行期 jcmd JFR.start(后者需 attach,进程存活期间),导出后用 jfr print/summary 解析,不需要 GUI 也能出结论。

### 边界:JFR 不是万能记录仪

采样有偏(见第 24 题):Windows 上本机实测 ExecutionSample 为 0 而 ObjectAllocationSample 正常记录 120 条——采样器能力随平台与版本变化,不能假设"JFR 开了就什么都有"。事件有保留窗口(环形缓冲),排障前没开就永远丢了;还有 attach 时机问题:本机实验中负载 1.5 秒跑完,事后 jcmd JFR.start 只录到空转,执行采样为 0——录制的起止窗口必须覆盖事件发生期。

### 取舍:jstack 与 JFR 的分工场景

死锁与挂死:先 jstack 全量栈(瞬间冻结视图)。慢与抖:JFR 时间线(分配曲线、GC、锁等待对齐)。内存涨:JFR 分配采样定位速率源,堆转储定静态底座,两者接力。生产策略:default 档常开加告警触发时临时 profile 档短录(如 60 秒),文件落独立盘;把"是否已开 JFR"写进值班手册第一行。

## 案例

### 实证:profile 档 8 秒的采集清单

命令与摘要(Java 17.0.17,-XX:StartFlightRecording=duration=8s,filename=probe2.jfr,settings=profile):
```
jfr summary probe2.jfr
  jdk.ObjectAllocationSample  120
  jdk.ClassLoaderStatistics    42
  jdk.ThreadAllocationStatistics 39
  jdk.ExecutionSample           0   <- Windows 本机采样器未产出
```
验证:同命令重跑分配采样数量同量级;ExecutionSample 为 0 是平台现象(见第 24 题),不代表 JFR 失效——分配、类加载、线程统计的时间线证据已足够支撑"哪段代码在大量分配"的判断。

### 追问链:JFR 三刀

一刀:"和 APM(链路追踪)重复吗?"——APM 看请求维度,JFR 看进程资源维度;分配热点、GC 细节、锁竞争是 APM 采集不到的,两者互补成完整证据链。二刀:"什么时候必须 jstack?"——怀疑死锁、线程池打满且要逐线程看状态、需要确认线程卡在哪个 native 调用;这些是"此刻全量"问题。三刀:"录制怎么不丢事故?"——-XX:+HeapDumpOnOutOfMemoryError 配 JFR 常开,dump 与时间线一起出;再配 jdk.OldObjectSample 类的泄漏对象事件(profile 档),长生命周期大对象可以直接点名。

## 总结点

1. jstack 一帧,JFR 一路
2. 分配锁 IO,时间线对齐
3. default 常开,profile 短录
