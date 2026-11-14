<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 GC 沙盘:可达性分析(GC Roots 出发沿引用链遍历)而非引用计数(循环引用问题)——能到达=存活,不可达=可回收。

1. 可达性分析:从 GC Roots(线程栈/静态字段/JNI 引用/活跃线程)出发沿引用链遍历——可达=存活,不可达=可回收;解决引用计数的循环引用问题(A→B→A 无外部引用→都不可达→都回收)。
2. 四种引用:强引用(不回收)>软引用(内存不足回收)>弱引用(下次 GC 回收)>虚引用(不影响,仅通知)——第 29 题 JVM 详解。
3. finalize 的影响:finalize 执行前对象入 F-Queue→GC Roots 包含 F-Queue→对象复活→下次 GC 不可达才真正回收——finalize 至少两轮 GC(第 11 题拖累回收)。

## 参考分析

### 机制:GC Roots 为什么是根

GC Roots=确定存活的起点(线程栈中变量/静态字段/JNI/活跃线程)——从起点沿引用链追踪,所有可达对象=正在使用;类比追踪感染链:从已知感染者出发追踪,未追踪到=可安全隔离。

### 反例:可达性的两种事故

事故一:静态集合持有——业务认为不用了但静态 Map 还引用→GC 无法回收(内存泄漏,第 82 题);修复=用完 remove 或 WeakHashMap。事故二:finalize 复活——finalize 中 this 赋给静态字段→对象复活且 finalize 不再执行;修复=Cleaner(不可复活)。

### 取舍:引用类型的选择

强=常规对象/软=缓存(内存不足回收)/弱=辅助映射(WeakHashMap)/虚=清理通知(DirectByteBuffer)——按回收时机严格程度选,引用选错=回收时机完全失控。

## 案例

### 验证:可达性的走查核对

验证:GC Roots 遍历断言(静态置 null→可回收);循环引用断言(A→B→A 无外部→都回收);四种引用断言(强不回收/软内存不足回收/弱下次 GC 回收/虚不影响)——四组固化可达性语义(本机可复跑)。

### 追问链:GC Roots 三刀

一刀:GC Roots 来源=虚拟机栈+方法区静态/常量+JNI+活跃线程+同步锁。二刀:finalize 对可达性的影响=F-Queue 入队→复活→两轮 GC(第 11 题)。三刀:泄漏判断=堆转储 MAT 对比+Full GC 后不回落(第 82 题)。

## 总结点

1. 可达性分析从 GC Roots 出发
2. 循环引用 JVM 可回收
3. 四种引用按回收强度选
