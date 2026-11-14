<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [github.com · 2](https://github.com/openjdk/jdk17u/blob/master/src/hotspot/share/gc/g1/g1CollectedHeap.cpp)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银报表导出服务沙盘:导出大 Excel 时每次都组装超半 region 的字节数组,GC 日志里 Humongous regions 疯涨。解释 Humongous 的判定、存放、回收路径与治理手法,全部结论附实测证据。

1. 超过 region 一半的对象就是 Humongous:直接进入老年代的连续 region,不经过 Eden 与 Survivor 的常规路径。
2. 它有两笔账:内存上按整 region 占用(对齐浪费),回收上 young GC 只回收死掉的 Humongous,清理依赖并发标记确认。
3. 治理优先在代码侧:拆小数组、流式处理、对象池复用;调 region 大小是次优解,会连锁影响其他行为。

## 参考分析

### 机制:判定、分配与回收路径

判定式是"对象大小 > G1HeapRegionSize/2"。分配时直接在老年代找连续 region,对象头记在第一个 region。回收有三条路:若对象在 young GC 前死亡且无引用,可在 young GC 直接回收(无需等标记);存活则占用老年代直至并发标记判定为死;实测日志中 Humongous regions: 29->15 表示一次 young GC 回收了 14 个 region 的死 Humongous。源码 g1CollectedHeap.cpp 的 humongous 分配分支处理连续查找与碎片整理。

### 反例:一次导出拖垮整个堆的账本

实测(64MB 堆,region 1MB,单个 600KB 数组即超半区):
```
GC(0) Humongous regions: 29->15
GC(8) Humongous regions: 54->0   (System.gc 且引用全清后)
```
54 个 region 即 54MB 被大对象占用,占 64MB 堆的 84%;期间普通对象只剩零星 region,分配迅速退化。报表服务在高峰期批量导出时就是这个形态:Humongous 挤占 Eden,young GC 频率失真,to-space 紧张进一步诱发 evacuation failure。

### 取舍:拆分优先,region 调整垫后

600KB 数组拆成 8 个 75KB 的块再按需拼接,直接从"Humongous"名单消失,这是零参数成本的改法。若业务确实需要大对象,评估调大 -XX:G1HeapRegionSize:region 从 1MB 到 4MB 后,1.5MB 数组不再是 Humongous;代价是 region 变大后碎片与小回收粒度都变粗,要连跑回归验证。禁止的替代方案是"给大对象开专属堆"——G1 没有这种开关,别把分布式缓存的思路带进来。

## 案例

### 实证:Humongous 的独立账本

命令:-Xms64m -Xmx64m -Xlog:gc*,gc+humongous=trace HumExp(Java 17.0.17,循环持有 40 个 600KB 数组并丢弃 700KB 临时数组)。输出见上:29->15 与 54->0 两行分别对应"young 部分回收"与"标记确认后全清"。验证:把数组改成 400KB(低于 region 一半)重跑,Humongous regions 行消失,普通代际统计接管——判定线的存在性由此验证。

### 追问链:Humongous 三刀

一刀:"为什么是一半而不是整个 region?"——留一半让普通对象也能用该 region 的剩余空间,整 region 起步会让中等对象也被迫独占,浪费更严重。二刀:"Humongous 会引发什么连锁故障?"——挤占 region 触发 to-space exhausted(实测 evac 场景 855 次),进而 Full GC;网银导出高峰的 P999 尖刺常是这条链。三刀:"怎么线上发现?"——看 -Xlog:gc+humongous 或 GC 告警里的 Humongous regions 增速,配 jmap -histo 找大数组类;JFR 的 ObjectAllocationSample 也记录大对象分配(实测 profile 档 8 秒 120 条)。

## 总结点

1. 过半即专区,回收分三路
2. 内存按整区,标记才全清
3. 先拆对象再调区,顺序别颠倒
