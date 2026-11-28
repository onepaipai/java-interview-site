<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银值班沙盘:故障排查时有人在 30GB 堆的生产服务上执行全量堆转储,STW 数十秒,把一次可恢复的抖动变成事故。给出诊断命令的风险分级、执行前检查清单与替代方案。

1. 命令分三档风险:高危(全量堆转储、某些 histogram 的全堆扫描)有 STW 与 IO 成本;中危(NMT detail、PrintFlags)有持续开销;低危(线程栈、GC 日志开关)秒级完成。
2. 执行前四问:堆多大、此刻流量多少、命令会停多久、落盘写到哪;四问答不上来,先降级用替代命令。
3. 替代优先:jcmd GC.class_histogram 代替全量 dump 初筛,JFR 时间线代替反复打栈,预发复现代替生产试探。

## 参考分析

### 第二步扩展① 机制:高危命令的成本构成

- 全量堆转储(jcmd GC.heap_dump / jmap -dump):先 STW 冻结全堆再遍历写文件,成本=堆大小×遍历速度+磁盘写。
- 30GB 堆常见数十秒 STW 加数百 MB 到数十 GB 文件。
- GC.class_histogram 默认也走全堆遍历(比 dump 轻:不落盘,只统计)。
- NMT detail 档每条分配记账,常态开销 5-10%。
- PrintCompilation/PrintInlining 类动态开关改写 JIT 行为,生产慎用。
- 风险分级的前提是知道每条命令"动了什么"。

### 第二步扩展② 反例:一个 histogram 引发的雪上加霜

- 值班看到内存高,先 jmap -histo:live——注意 live 变体先触发一次 Full GC 再统计:本就紧张的老年代被强制 Full,若底座不可回收(第 13 题),Full 只是白付暂停。
- 叠加流量高峰,雪上加霜。
- 更糟的是选了 dump 落到应用盘,把数据盘写满,服务直接崩。
- 规范动作:高峰期用不带 live 的 histogram(无强制 Full)初筛,dump 必须低谷加独立盘加审批。

### 第二步扩展③ 取舍:分档清单与自动化护栏

- 低危(值班可直接):Thread.print、GC.class_histogram(非 live)、VM.flags、GC 日志动态调级。
- 中危(二线确认):NMT 开关变更、PrintCompilation 类开关。
- 高危(审批+窗口):全量 dump、live histogram、堆外探测类。
- 护栏:生产脚本封装高危命令(前置检查堆大小、时间窗、落盘空间),把审批流程嵌进工具。
- 文档明确每条命令的 STW 量级。

## 案例

### 第三步发散·验证与推演 实证:轻量直方图与全量 dump 的成本差

- 本机证据(Java 17.0.17,小堆演示成本结构):jcmd GC.class_histogram 对 6 万实例的堆秒级返回(代理实验,200 类在册,总实例 61130)且无感。
- 而 HeapDumpOnOutOfMemoryError 场景的 dump 成本随堆线性增长(生产 30GB 堆为推演,标注)。
- 验证要点:histogram 的 STW 感知在同机压测下毫秒级,证明初筛用 histogram 的分流价值。
- 高危命令的量化成本在类生产环境补测。

### 第三步发散·追问扩展 追问链:诊断三刀

- **Q1：为什么 live histogram 会触发 Full?**
  - 答：live 语义需要先确知死活,JVM 以 System.gc 加可达性遍历实现;要活对象账本就要付这次 GC,参数设计如此,不是 bug。
- **Q2：JFR 能替代哪些高危操作?**
  - 答：分配热点(ObjectAllocationSample)替代反复 histogram,时间线替代反复打栈,OldObjectSample 代替"猜泄漏对象";录制本身低开销,事后离线分析。
- **Q3：事故复盘怎么沉淀?**
  - 答：把本次用过的命令、成本、替代方案写进值班手册;每次事故后更新分级清单,让下次响应更快更稳。

## 总结点

1. 高危有 STW,执行前四问
2. histogram 分诊,dump 要审批
3. JFR 先行,预发复现代替试探
