<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：一个服务出现内存告警，堆占用正常但进程 RSS 持续上涨。把运行时数据区按"存什么、谁分配、受什么参数约束"整理成排查框架，用于定位告警属于哪一区。

1. 堆存对象实例与数组，由垃圾回收管理，受 Xmx/Xms 约束；所有线程共享，是 GC 和 OOM(Java heap space) 的主战场。
2. 线程栈存方法帧（局部变量、操作数栈），按线程私有一块块分配，受 Xss 约束；溢出表现为 StackOverflowError 或无法创建线程。
3. 元空间存类元数据（类结构、方法字节码、运行时常量池引用），使用本地内存，受 MaxMetaspaceSize 约束；动态生成类过多会把它顶爆，报 OutOfMemoryError: Metaspace。

## 参考分析

### 机制：三区按生命周期与共享性划分

堆放"数据本体"，栈放"执行现场"，元空间放"类型描述"。类比仓库、工作台与图纸室：仓库里的货（对象）大家都能搬，每个工人（线程）有自己的工作台（栈帧），图纸（类元数据）集中放在图纸室，新进一种货要先复印图纸。三区只有堆被 GC 常规回收；栈随方法进出自动伸缩；元空间靠类卸载回收，而类卸载依赖类加载器死亡（见第 38 题）。

### 边界：字符串常量池、CodeCache 和直接内存都不在三区名字里

字符串常量池自 JDK 7 起在堆内；JIT 编译后的代码放在 CodeCache（本地内存，受 ReservedCodeCacheSize 约束）；NIO 直接内存也是本地内存，受 MaxDirectMemorySize 约束。排查 RSS 时三区参数都不管它们——这正是"堆正常但 RSS 涨"的最常见去向（见第 7、33 题）。

### 取舍：参数与排查动作的对应关系

告警归类口诀：看堆用 jcmd GC.heap_info，看类用 jcmd GC.class_stats（需解锁诊断选项），看本地内存用 NativeMemoryTracking。把每个区先映射到"一个参数 + 一个观测命令"，比背内存模型图更能回答面试追问。容器环境还要把这些区加总对齐 cgroup 上限（见第 48 题）。

## 案例

### 对照操作：三区各自的观测命令

教学验证：以 `-XX:MaxMetaspaceSize=64m` 启动，循环用 CGLIB 生成代理类。预期：堆直方图变化不大，`jcmd PID GC.class_stats` 可见类数上升，最终抛 OutOfMemoryError: Metaspace；同一负载改放在数组里撑堆，则报 Java heap space。两种 OOM 的错误信息区分了责任区，可复现。

### 追问：Xss 调大有代价吗

栈变深能缓解深递归的 StackOverflowError，但每个线程常驻内存按 Xss 预留，千线程级服务会把 RSS 推高数百 MB，还可能撞上系统线程数限制（见第 32 题）。正确方向通常是收窄递归或改迭代，而不是无脑调大 Xss。

## 总结点

1. 堆放货，栈放现场，元空间放图纸
2. 堆看 Xmx，栈看 Xss，类看 MetaspaceSize
3. 堆正常 RSS 涨，先查本地内存三兄弟
