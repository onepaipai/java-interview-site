<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 GC 沙盘:对象晋升老年代的四条件(年龄达阈值/动态年龄/大对象/Survivor 放不下)+空间分配担保(老年代是否装得下新生代晋升对象)——第 44 题 JVM 的完整版。

1. 晋升四条件:一,年龄达 MaxTenuringThreshold(默认 15,每次 Minor GC 存活+1);二,动态年龄(同龄对象>Survivor 一半→提前晋升,第 44 题详解);三,大对象直接老年代(Humongous,超 region 一半);四,Survivor 放不下(Minor 后存活>Survivor→直接老年代)。
2. 空间分配担保(Minor GC 前):老年代连续空间>新生代所有对象总大小(极端假设全晋升)或>历次晋升平均大小→担保成功(Minor GC 安全执行);失败→Full GC(先腾老年代空间)——JDK 6+ 默认有担保(HandlePromotionFailure=true),但担保失败仍可能触发 Full GC。
3. 动态年龄的精确定义:GC 后按年龄从小到大累计Survivor 中对象大小,超过 TargetSurvivorRatio(默认 50%)×Survivor 容量的年龄成为新的晋升阈值——阈值动态计算(每轮 GC 后重算,不是固定的"50%"——第 44 题:参数是可调的不是死值)。

## 参考分析

### 机制:晋升与老年代压力

晋升速率=每秒晋升到老年代的字节数——晋升过快→老年代快速填充→Mixed GC 频率增加或 Full GC;晋升过慢→Survivor 放不下(空间分配担保失败)→直接进老年代——晋升速率是 GC 调优的核心观测量(GC 日志中的 promotion rate)。

### 反例:晋升的两种事故

事故一:大对象频繁晋升——报表生成 50MB byte[]每次都直接进老年代→老年代碎片+Full GC;修复=流式处理或对象池(第 45 题 jvm-advanced 大对象)。事故二:Survivor 太小→动态年龄提前晋升——存活率高的应用(缓存预热后)Survivor 不够→过早晋升→老年代压力;修复=增大 Survivor 或调整 TargetSurvivorRatio。

### 取舍:MaxTenuringThreshold 的调优

阈值高(15):对象在 Survivor 存活更久(减少过早晋升)但 Survivor 压力大;阈值低(1):快速晋升(减少 Survivor 复制成本)但老年代压力大——阈值的选择=Survivor 容量与老年代容量的平衡(G1 下由 region 动态决定,参数含义变化,第 44 题取舍)。

## 案例

### 验证:晋升的走查核对

验证:晋升断言(年龄达阈值→晋升到老年代,jmap -histo:live 前后对比);动态年龄断言(Survivor 同龄对象>50%→提前晋升);大对象断言(Humongous 直接进老年代);空间担保断言(极端晋升→担保失败→Full GC)。验证:GC 日志中的晋升速率与晋升年龄可程序化(GC 日志分析,第 44 题实测:MaxTenuringThreshold=15 但对象几次就进老年代)。

### 追问链:晋升三刀

一刀:"晋升速率怎么监控?"——GC 日志的 promotion(每 GC 的晋升字节数)+趋势分析(晋升速率上升=老年代压力增加)——晋升速率是 GC 调优的核心观测量。二刀:"G1 的 Humongous 回收?"——Humongous 对象在并发标记时如果不可达→可被 Young GC 回收(部分)——但分配时的连续 region 需求→碎片风险(第 45 题)。三刀:"晋升与分代回收器的匹配?"——G1 的 Humongous 直接进老年代 region(不经过 Survivor);Serial/Parallel 的大对象也直接进老年代(Tenured);不同回收器的晋升行为有差异——按回收器文档核对。

## 总结点

1. 晋升四条件:年龄/动态/大对象/Survivor 放不下
2. 空间担保失败→Full GC
3. TargetSurvivorRatio 是可调参数
