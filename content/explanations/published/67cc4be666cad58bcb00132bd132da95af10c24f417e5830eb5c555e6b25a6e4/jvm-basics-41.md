<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：CPU 400% 持续，单次 jstack 的栈看起来都"很正常"。把线程转储从"拍快照"升级为"采样统计"，给出与 top -Hp、JFR 的配合用法与常见误读。

1. 定位链路：top -Hp PID 列出线程级 CPU → 取最忙线程号转十六进制（printf %x）→ 在 jstack 输出按 nid 匹配 → 读该线程栈的当前帧。
2. 单次快照会错过：CPU 由许多短方法轮流贡献时，一次快照恰好停在无关帧。正确做法是多次采样（如每 100ms 一次、连采 20 次），统计同一帧出现频率——频率即热点。
3. jstack 只给"此刻在哪"，不给"谁让它在这"：需要调用来源与时间占比时用 JFR ExecutionSample/Method Profiling 聚合，两者互补不互替。

## 参考分析

### 机制：把离散快照叠成直方图

单次转储像对着跑动的人拍照：一张照片看不清动作，连拍二十张叠起来就能看出他大部分时间在哪个位置。统计"同一线程同一栈顶帧"的出现次数，排序后第一名就是热点——这就是轻量的 poor man profiler，无需任何工具接入。

### 反例：三个常见误读

一，快照停在 socketRead 就断定"等网络"——没有采样统计，一次快照证明不了时间占比；二，忽略线程名与状态，把 WAITING 的池线程当热点；三，拿 jstack 去追 JIT/GC 线程（它们是 native 线程，Java 栈信息有限）——该用 JFR/GC 日志的别用栈。

### 取舍：三工具的分工表

top -Hp 定"哪条线程"；jstack 连采定"在哪个 Java 方法"（含业务上下文）；JFR 定"时间占比与调用来源"（可长期挂、开销低）。真实排障顺序通常：top -Hp 发现 → jstack 快速猜 → JFR 复核，成本逐级升高。

## 案例

### 对照操作：20 次采样叠出热点

教学验证：制造一个热方法（正则回溯），间隔 100ms 采 20 次 jstack，统计栈顶帧频率。预期：目标方法帧出现率超 80%，其余为噪声；对照健康线程组采样无集中帧。把两次实验的统计结果并排，"采样统计法"即学即用。

### 追问：为什么栈顶帧才算数

采样统计的是"此刻在执行什么"，栈顶是执行点，深层帧只是调用来源。统计应分别聚合"栈顶帧"（热点在哪）与"完整栈"（为什么走到这）；只看最外层入口会把 80% 时间误归到 main 上。

## 总结点

1. top 找线程，nid 对栈
2. 一次快照不算数，二十次叠直方图
3. 栈顶定热点，全栈定来源
