<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/troubleshoot/environment-issues.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：cgroup limit 2G 的容器里给堆配了 85%，运行数天后被内核 OOM kill。用"全进程账单"演示预算拆分方法，解释 MaxRAMPercentage 与 ExitOnOutOfMemoryError 的配套逻辑。

1. 账单分项：Java 堆（Xmx/MaxRAMPercentage）+ 元空间 + CodeCache + 线程栈（线程数×Xss）+ 直接内存 + GC 辅助结构与 JIT 缓冲 + 余量，总和必须小于 cgroup limit。
2. MaxRAMPercentage 只切分堆占比：容器内 JVM 感知 cgroup 后按比例算堆，但它不知道你给元空间/线程/直接内存留了多少——比例默认偏大（多核大内存机器按 25% 算，容器内需显式设置）。
3. 余量不是浪费：GC 并发线程工作内存、metaspace 增长、堆外突发都需要缓冲；经验值留 20–35%，并配 -XX:+ExitOnOutOfMemoryError 让 Java 层 OOM 快速失败、靠重启恢复，而不是被内核 OOM kill 留不下现场。

## 参考分析

### 第二步扩展① 机制：内核 OOM kill 与 Java OOM 是两套裁判

- cgroup 超限由内核直接杀进程（无堆转储、无日志缓冲刷新）。
- Java OOM 由 JVM 抛错（有堆栈、可配转储、可配快速退出）。
- 预算拆分的全部意义：让"第一次爆"发生在 Java 层、有证据可查，而不是内核无声处决。
- 类比给家里各房间装分闸：跳的是房间闸，而不是总闸全楼黑。

### 第二步扩展② 反例：85% 堆的内核处决

- limit 2G、堆 1.7G：元空间 150M + CodeCache 100M + 50 线程×1M + 直接内存 200M，合计超限。
- 高峰直接内存一涨，cgroup 先爆——dmesg 有一行 oom-kill，Java 日志干干净净。
- 修正：堆降到 60%（1.2G）并显式设 MaxDirectMemorySize=256m，RSS 回到 limit 内，此后 OOM（若有）全部是 Java 层可诊断事件。

### 第二步扩展③ 取舍：百分比、绝对值与验证闭环

- 参数形式的选择：固定规格容器用绝对值（-Xmx1g 等）最可控。
- 弹性规格用 MaxRAMPercentage。
- 无论哪种，都要用 NMT/RSS 监控验证一周基线，再回头修预算表——预算是假设，监控是验收。
- 本项目实践：65% 堆 + OOM 快速退出，审查建议降至 55–60%（见审查记录）。

## 案例

### 第三步发散·验证与推演 对照操作：预算表逐项对账

- 教学验证：limit 2G 容器内按表逐项核对——jcmd GC.heap_info（堆）、VM.native_memory summary（本地内存分项）、线程数×Xss、NMT Internal（直接内存）。
- 预期：分项合计 + 15–25% 余量 ≤ 2G。
- 把表格贴进部署文档，参数变更必走对账。
- 演练可离线完成。

### 第三步发散·追问① 追问：为什么不直接把 limit 调大省去拆分

- 调大 limit 推高成本且不改变"账单失控"的本质：下一次直接内存泄漏照样内核处决，只是更晚。
- 拆分的价值是让每个资源项可观测、可独立设限（MaxDirectMemorySize、MaxMetaspaceSize、Xss），故障时第一时间知道"谁的账爆了"。

## 总结点

1. 分闸胜过总闸，余量不是浪费
2. Percentage 只切堆，账单自己拆
3. Java 层 OOM 要快失败
