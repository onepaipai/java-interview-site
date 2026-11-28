<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银额度查询服务沙盘:配置 -XX:MaxGCPauseMillis=5 后 P99 仍有尖刺,用户以为参数是承诺。用实测日志说明该参数在 G1 内部如何参与决策、哪些因素绕过它,以及正确的用法。

1. 它只是规划输入:G1 按历史暂停统计反推 young region 数量,尽量贴近目标,但存活集大小与疏散成本不归它管。
2. 两类暂停绕过目标: evacuation 演化出的 Full(G1 Compaction Pause)与 to-space exhausted 下的应急处理,不参与 young 目标规划。
3. 把目标设得过小会催生频繁 GC:每次只疏散少量 region,单位时间 GC 次数上升,总吞吐反而下降。

## 参考分析

### 第二步扩展① 机制:目标参数在 CSet 圈选里的位置

- G1 记录每个 region 的疏散预测耗时,MaxGCPauseMillis 与 -XX:G1PauseTimeInterval 一起驱动预测器:young GC 前按"预计暂停 ≤ 目标"决定收多少 Eden/Survivor region。
- 预测模型用的是历史平均,遇到存活集突增(如缓存批量加载)预测失效,暂停就超。
- 实测同一参数下 young 暂停在 2.4 至 6.2ms 波动,说明目标≈统计意义上的中位引导,不是逐次承诺。

### 第二步扩展② 反例:80ms 的 Full 完全无视 5ms 目标

- 实测日志:
```
GC(30) Pause Full (G1 Compaction Pause) 511M->407M(512M) 80.755ms
```
- Full 是全堆压缩,由 to-space exhausted、Metaspace 满或 System.gc 等触发,它的耗时由存活总量决定,与 5ms 目标无关。
- 把参数当承诺的团队会在这里得出"G1 失灵"的错误结论,正确结论是:出现 Full 时调 young 参数没有意义,要先消灭 Full 的触发条件。

### 第二步扩展③ 取舍:目标值的选择与验证

- 目标从当前实际暂停分布出发:实测中位 3ms、目标设 5ms 是"温和收紧"。
- 若实际中位 20ms 却设 5ms,G1 只能缩小每次回收量,GC 频率上升。
- 验证方式是看日志分布而不是平均值:改完后 P999 对应的暂停分位应向目标收敛,同时 allocation rate 与 GC 频率的乘积不显著上升。

## 案例

### 第三步发散·验证与推演 实证:目标与实测分布的对照

- 命令:-Xms512m -Xmx512m -XX:MaxGCPauseMillis=5 -Xlog:gc*:file=pause.log(Java 17.0.17)。
- 对 13 次 young 暂停取分布:
```
Pause Young (Normal) (G1 Evacuation Pause) 25M->5M(512M) 2.404ms
Pause Young (Normal) (G1 Evacuation Pause) 50M->50M(512M) 6.211ms
Pause Full  (G1 Compaction Pause) 511M->407M(512M) 80.755ms
```
- 验证:重跑同负载,分布同量级。
- 结果证明目标控制的是"多数 young 尽量贴近",不约束 Full 与极端存活集。

### 第三步发散·追问扩展 追问链:暂停目标三刀

- **Q1：为什么不做成硬上限?**
  - 答：硬上限意味着宁可暂停中途放弃回收,留下半疏散状态,正确性代价极高;G1 选择"尽力贴近"是工程折中。
- **Q2：目标设 1ms 会怎样?**
  - 答：每次回收极少 region,GC 频率暴涨,实测同负载下暂停中位反而可能更差,且有更多并发标记周期抢 CPU。
- **Q3：怎么知道目标该设多少?**
  - 答：先看无目标时的暂停分布与 GC 频率,把目标设在 P99 暂停附近,再用日志验证分布收敛,而不是拍脑袋给 5ms。

## 总结点

1. 目标是引导,不是承诺
2. Full 不归它管,先消灭触发源
3. 目标过小,频率反噬吞吐
