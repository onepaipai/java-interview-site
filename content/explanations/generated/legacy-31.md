<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 GC 沙盘:弱分代假设(大多数对象朝生夕死)→新生代频繁低成本回收(Minor)与老年代低频高成本回收(Full);G1 独有 Mixed GC(选择性回收老年代 region)。

1. 弱分代假设:对象生命周期二八分布(大多数朝生夕死)→新生代/老年代分区——假设成立时分代高效;不成立(大量中寿命对象)→调整 Survivor 或换不分代回收器(ZGC,第 75 题)。
2. GC 类型:Minor(新生代,Eden 满→Survivor 复制,高频快速)/Mixed(G1 独有,新生代+部分老年代 region,并发标记后按回收价值选择)/Full(全堆压缩,STW 最长,兜底——G1 的 Full 是失败降级,第 14 题 JVM)。
3. 对象晋升:Eden→Survivor(年龄+1)→达阈值或动态年龄→老年代;大对象直接 Humongous(超过 region 一半);动态年龄:同龄对象>Survivor 一半→提前晋升(第 44 题详解)。

## 参考分析

### 第二步扩展① 机制:分代为什么高效

- 新生代 98% 对象 Minor GC 死亡→复制只移动 2%(极快)。
- 老年代存活率高→整理(避免碎片)——分代把高频低成本与低频高成本分开,总成本最优。
- 类比:门诊(高频低成本)vs 手术(低频高成本)分开。

### 第二步扩展② 反例:分代的两种事故

- 事故一:Survivor 太小→动态年龄提前晋升→老年代压力(第 44 题)。
- 修复=调 SurvivorRatio。
- 事故二:Humongous 进新生代→放不下→直接老年代→碎片。
- 修复=增大 region 或拆分。

### 第二步扩展③ 取舍:分代参数的调优

- -Xmn/-XX:NewRatio/-XX:SurvivorRatio/-XX:MaxTenuringThreshold——依据=对象存活率画像(JFR+GC 日志,第 44 题)。
- G1 下参数含义变化(region 动态决定)。

## 案例

### 第三步发散·验证与推演 验证:分代 GC 的走查核对

- 验证:本机实验(-Xlog:gc* 观察 Minor/Mixed/Full 分布)。
- 分代假设验证(JFR ObjectAllocationSample 看生存期分布)。
- Minor 触发(Eden 满)。
- Humongous 分配(大数组→老年代)——第 14/15/44 题 JVM 实测数据可复用。
- 验证:GC 日志分代行为断言可程序化。

### 第三步发散·发散要点 追问链:分代三刀

- **追问①·Minor 触发**：Eden 满(不是 Survivor 满)
- **追问②·G1 Mixed**：并发标记完成后按回收价值选择老年代 region(第 73 题)
- **追问③·不分代回收器**：ZGC JDK 17(全堆并发标记,大存活集时周期长,第 75 题);分代 ZGC=JDK 21 JEP 439

## 总结点

1. 弱分代假设→分代高效
2. Minor 快,Mixed 精准,Full 兜底
3. 参数依据=存活率画像
