<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银风控沙盘:Full GC 后老年代仍占 92%,团队在"扩堆"与"查泄漏"间摇摆。给出 Full GC 后高占用的判读框架:活对象底座、内存地板、大对象残留三类,以及各自的验证动作。

1. Full GC 后的高占用≈不可回收底座:先看 jmap -histo:live 的活对象总量——它就是当前代码形态下的内存地板。
2. 三类底座三查法:活对象底座(缓存/无界集合,第 13 题画像)、元空间与堆外挤占(第 15/17 题)、大对象残留(Humongous 回收滞后,第 4 题)。
3. 扩堆判断:底座/堆>70% 时扩堆是容量问题;底座小却高占用,是回收或记账问题,扩堆治不了。

## 参考分析

### 机制:Full GC 清什么、留什么

Full GC(压缩)清的是不可达对象,留下的=GC Roots 可达的活对象。它不清:元空间(另账)、直接内存与 JNI(堆外)、以及"逻辑泄漏"对象(可达但业务已不用)。实测锚点(批 1):引用全清后 Humongous regions 54->0,同一堆在引用未清时大对象稳占 54MB——Full 前后差异完全由可达性决定。所以"Full 后仍高"第一步永远是活对象盘点,而不是回收器怀疑。

### 反例:把堆外挤占当堆泄漏

风控服务 Full 后堆占用 60% 但容器 RSS 95%:堆直方图显示活对象远小于堆,差额在堆外(直接内存缓冲池上涨,BufferPool 指标同步)。若按"堆泄漏"查下去半天无果;按第 17 题三本账对齐,10 分钟定位。判读要点:堆占用看 GC 日志与直方图,RSS 看容器,两本账分开记;Full 后"堆内高"与"RSS 高"是两个不同的案子。

### 取舍:三类底座的验证与动作

活对象底座:histo:live 按类型与支配树定持有者,治理对象寿命(缓存上限/TTL)。元空间与堆外:NMT 分类对账(本机:Metaspace 522KB committed、Internal 222KB,direct buffer 另账),配 BufferPool 监控。大对象残留:humongous 日志看 Humongous regions 是否随 Full 归零,不归零则引用链未断。动作顺序:先归账(哪个底座),再治理,扩堆只在第一类且治理后仍>70% 时启动。

## 案例

### 实证:Full 前后的大对象账本对照

本机证据(Java 17.0.17,64MB 堆,批量持有 600KB 数组):
```
Full 前: GC(2) Humongous regions: 28->21   (young 只能部分回收)
引用全清+System.gc 后: GC(8) Humongous regions: 54->0
                     Pause Full (System.gc()) 57M->3M(64M) 3.876ms
```
解读:Full 后堆从 57M 降到 3M——当 Full 真的能清干净时占用暴跌;生产上"Full 后仍 92%"意味着底座真实存在。验证:live 直方图与支配树定位底座持有者(流程见第 12 题),与堆账互证。

### 追问链:Full 后高占用三刀

一刀:"为什么不直接看 Full GC 日志里的堆用量?"——日志给总量不给构成;histo:live 给类型构成,支配树给持有链,两者合成完整归因。二刀:"G1 混合期反复 Full 怎么解释?"——若 mixed 不来(垃圾占比低)加 to-space 紧张,Full 被 to-space exhausted 触发(批 1:855 次),它清的是可回收部分;Full 后仍高的部分才是底座,别把两次 Full 间的波动当泄漏。三刀:"监控怎么预防?"——把"Full 后老年代基线"做成趋势指标:基线每周抬升即泄漏立案,横盘即容量问题,两条线对应两套动作。

## 总结点

1. Full 留下的就是底座
2. 堆内堆外分账,别混案
3. 先归账再治理,扩堆是末选
