<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 GC 沙盘:Full GC 每小时 3 次(正常应该 0)——排查=确认 Full GC 类型(调用/碎片/promotion failed)→分析根因→修复,第 78 题 JVM 的完整版。

1. Full GC 的触发类型:一,System.gc()调用(RMI/代码显式调);二,Metaspace 满(类加载泄漏);三,晋升失败(老年代空间不足→Promotion Failed);四,碎片(标记-清除后大对象无连续空间→Compact);五,Humongous 分配失败(G1 to-space exhausted→Full)。
2. 排查流程:GC 日志分析(-Xlog:gc*→Full GC 的触发原因:System.gc/Promotion Failed/Metaspace)→堆使用画像(老年代增长速率/晋升速率→是泄漏还是不足)→内存分析(dump→MAT)→修复验证。
3. 修复方向:System.gc→禁用(-XX:+DisableExplicitGC)或 RMI 参数调;Metaspace→类加载器泄漏排查(第 37 题 JVM);晋升失败→扩老年代或降低晋升速率;碎片→G1 或 CMS 碎片整理;Humongous→增大 region 或拆分大对象(第 6 题 jvm-advanced)。

## 参考分析

### 第二步扩展① 机制:Full GC 的"降级"性质

- G1 的 Full GC=evacuation failure 的降级(并发回收失败→STW 全堆压缩)——不是"常规操作"而是"兜底"。
- Full GC 频繁=G1 的并发回收出了问题(晋升太快/Humongous 过多/碎片)——排查 Full GC 的本质=排查"为什么并发回收失败了"。

### 第二步扩展② 反例:Full GC 的两种事故

- 事故一:忽略 Full GC 触发原因——看到 Full GC 就调 -Xmx(如果根因是 System.gc 或 Metaspace 泄漏,调堆无效)。
- 修复=看 GC 日志的触发原因分类处置。
- 事故二:Full GC 频繁但 P99 正常——Full GC 虽然暂停长但频率低(如每天 1 次)→业务影响有限(夜间发生)。
- 修复=监控+定期处理,不等同于紧急事故。

### 第二步扩展③ 取舍:Full GC 的容忍度

- Full GC 的容忍度=暂停时长×频率对业务的影响——P999 敏感的系统(实时交易):Full GC=不可接受(必须消除)。
- 批处理系统:Full GC 暂停 2s 可接受(不在线上交易)——容忍度是业务参数不是技术参数。

## 案例

### 第三步发散·验证与推演 验证:Full GC 的走查核对

- 验证:GC 日志断言(Full GC 的触发原因分类——System.gc/Promotion Failed/To-space exhausted 各自对应)。
- 频率统计(每小时次数+每次耗时)。
- 修复验证(消除触发原因→Full GC 消失)。
- evac.log 实验(855 次 exhausted→Full,第 6 题 jvm-advanced)。
- 验证:Full GC 的频率与耗时断言可程序化(GC 日志分析工具)。

### 第三步发散·追问扩展 追问链:Full GC 三刀

- **Q1：System.gc 是谁调的?**
  - 答：RMI 的分布式 GC(定时调用,可 -XX:+DisableExplicitGC 禁用)+NIO 的 DirectByteBuffer 清理(可 -XX:+ExplicitGCInvokesConcurrent 改为并发)+业务代码——需要按调用来源区分处置。
- **Q2：Metaspace 导致的 Full GC?**
  - 答：Metaspace 满→Full GC 卸载类→如果类加载器泄漏则卸载失败→Full GC 反复;排查=GC 日志的 Metaspace 使用+类计数(jcmd GC.class_stats)。
- **Q3：Full GC 频繁但是年轻代导致的?**
  - 答：Young GC 晋升失败(老年代空间不足)→触发 Full GC——根因=老年代空间不足或晋升速率过高( Survivor 偏小→动态年龄晋升,第 44 题)。

## 总结点

1. Full GC=降级不是常规操作
2. 触发原因分类:gc/metaspace/晋升/碎片
3. 容忍度=业务参数不是技术参数
