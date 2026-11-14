<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银网关沙盘:Pod 反复被 OOMKilled,应用日志一片干净。解释 JVM 内存与 cgroup 记账的口径差异、容器内排查步骤,以及 -XX:MaxRAMPercentage 类参数的正确用法。

1. OOMKilled 是内核杀的:进程总内存(含堆外、元空间、线程栈、直接内存、page cache 计费部分)越过容器 limit,kill 发生在内核,Java 不会打 OOM 日志。
2. Java OOM 是 JVM 自觉的:只有当某条 JVM 内部分配路径(堆/元空间/直接内存)触到 JVM 自身上限时才抛 OutOfMemoryError。
3. 分析顺序:先取 cgroup 事件与 memory.stat 分解(anon/file),再用 NMT 对 JVM 侧分类归账,差值查直接内存与 JNI。

## 参考分析

### 机制:两套上限的交叉区域

容器 limit(如 2Gi)管进程全部;cgroup 计费含 anon(私有页)与 file(page cache,可回收部分按策略)。JVM 侧上限:堆 -Xmx、元空间、CodeCache、直接内存(MaxDirectMemorySize)、线程栈提交。当堆内还有余量但"堆外合计"越过容器 limit,内核先动手——这就是无 Java OOM 的 OOMKilled。UseContainerSupport(默认开)让 MaxRAMPercentage 按容器 limit 折算堆,但堆只是总账一部分,堆设到 limit 的 75% 仍可能被堆外挤死。

### 反例:把堆设满 limit 的配置事故

配置 -Xmx 等于容器 limit 的 95%:平时 page cache 与元空间吃满剩余 5% 就被杀。正确姿势:MaxRAMPercentage 60-75% 起步,预留元空间加 CodeCache 加线程栈加直接内存的合计;再按 NMT 实测校准。实测锚点:空闲 JVM 的 GC 类目就提交 64.9MB(128MB 堆),生产大堆的 GC 侧开销按比例更大——预留清单里漏 GC 开销是常见事故源。

### 取舍:监控与参数的配平

容器层监控 memory working set 与 limit 比例,设 80% 告警;JVM 层开 NMT summary 建立分类基线;直接内存与线程数另设上限。参数配平:MaxRAMPercentage 之外,显式 MaxDirectMemorySize、MaxMetaspaceSize、线程池上限,把每类可变内存变成有界,总量可加总校验——这是"让 OOMKilled 变成可预期的 Java OOM"的思路:宁可 JVM 先报错,不要内核静默杀。

## 案例

### 推演:cgroup 侧的取证步骤(Windows 本机无法复现容器行为)

步骤推演:kubectl describe pod 看 Last State: OOMKilled 与 exit code 137;节点上取 /sys/fs/cgroup/memory.events 的 oom 计数与 memory.stat(anon/file/sock)分解;JVM 侧开 NMT 拿分类账(本机实测:Total committed 334MB、Heap 128MB、GC 64.9MB、Thread 757KB committed 等),与容器 limit 相减,差值按直接内存与 page cache 归类。验证方式:同配置容器压测复现 killed 时刻的 memory.stat 快照。以上 cgroup 环节为推演(本机无 Linux 容器环境),NMT 数字为本机实测。

### 追问链:OOMKilled 三刀

一刀:"为什么 Java 不可能知道被杀?"——SIGKILL 不可捕获,内核直接回收进程;应用能做的是把内存账有界化,让触发点前移到 JVM 自觉报错。二刀:"MaxRAMPercentage 设多少?"——按 NMT 实测的堆外合计反推:堆=limit−(元空间+CodeCache+GC开销+栈+直接内存+余量),常见落点 60-75%,高峰大缓存场景更低。三刀:"page cache 会不会害人?"——会,文件密集应用读文件填 cache,cgroup 计费后在内存压力下才回收,瞬时计费可越过 alert 线;查 memory.stat 的 file 分量即知,这属于内核回收策略,不是 JVM 泄漏。

## 总结点

1. 内核杀进程,Java 不知情
2. 堆只是总账的一部分
3. 先看 memory.stat,再对 NMT 账
