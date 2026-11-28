<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银值班沙盘:CPU 100% 告警——排查=top 找进程→top -Hp 找线程→printf 转 16 进制→jstack 定位线程栈→分析热点(业务/GC/JIT/锁)。

1. 排查五步:一,top 找高 CPU 进程(PID);二,top -Hp PID 找高 CPU 线程(TID);三,printf "%x" TID 转 16 进制(nid);四,jstack PID | grep nid=0xXX -A 30(定位线程栈);五,分析栈(业务代码/GC 线程/JIT 编译线程/锁竞争)。
2. CPU 高的常见分类:业务代码(死循环/正则回溯/大量序列化)、GC(GC 线程 CPU 高——内存不足/GC 风暴)、JIT(C2 编译线程,启动期)、锁竞争(自旋/CAS 空转,第 13 题并发基础)——分类决定处置方向(业务/内存/等待/代码)。
3. 火焰图(Async-profiler/Arthas profiler):CPU 采样的可视化——宽度=CPU 占比,高度=调用深度——比 jstack 单次采样更准确(多次采样聚合);火焰图的判读=从顶向下找宽块(热点函数)。

## 参考分析

### 第二步扩展① 机制:CPU 高的"消耗模型"

- CPU=用户态+内核态:用户态高=业务代码在计算(死循环/序列化)。
- 内核态高=系统调用密集(IO/锁/内存分配)——用户态与内核态的比例缩小排查范围(用户态→应用层,内核态→IO/锁/GC)。

### 第二步扩展② 反例:CPU 排查的两种事故

- 事故一:jstack 一次采样定位——线程可能在采样间隙切换了(非热点线程被抓到)。
- 修复=多次采样取交集(3 次以上,栈顶一致的线程=真热点)。
- 事故二:CPU 高就重启——重启后 CPU 正常(内存也清了)→根因未定位(下次复发)。
- 修复=先采集证据(jstack/火焰图/JFR)再重启。

### 第二步扩展③ 取舍:CPU 排查的工具选择

- jstack:轻量(线程快照)但单次(可能错过)。
- Arthas:在线无侵入(trace/watch/profiler)。
- Async-profiler:火焰图(采样精确,需要安装)。
- JFR:持续 profiling(低开销,事后回看)——按"问题的偶发性"选工具(偶发用 JFR,持续用 Arthas)。

## 案例

### 第三步发散·验证与推演 验证:CPU 排查的走查核对

- 验证:注入 CPU 高(死循环/正则回溯/GC 风暴)→五步排查走查(top→top -Hp→printf→jstack→分析)——每步的输出可验证(top 确认进程/jstack 确认线程栈)。
- 火焰图对照(热点函数占比)。
- GC 线程 CPU 高的区分(jstack 中 GC 线程名含 GC)。
- 验证:排查流程的效率=从告警到定位的时长(演练计时)。

### 第三步发散·追问扩展 追问链:CPU 三刀

- **Q1：CPU 高与 Load 高的区别?**
  - 答：CPU=实际计算;Load=等待队列长度(含 IO 等待)——Load 高 CPU 低=IO 瓶颈(不是 CPU 问题,第 81 题 JVM 的 CPU/Load 区分)。
- **Q2：容器 CPU throttling?**
  - 答：容器 CPU limit 被 cgroup 限制(throttling 指标单独看)——CPU limit 内的 CPU 高=正常(限流≠故障,第 81 题 JVM 容器)。
- **Q3：CPU 高的自动化处理?**
  - 答：确定性故障(死循环)→自动化摘实例+取证;非确定性(偶发慢)→告警人工排查——自动化按确定性分级(第 145 题止损动作分级)。

## 总结点

1. top→top -Hp→printf→jstack→分析
2. 多次采样取交集,单次不可靠
3. 火焰图比 jstack 更精确
