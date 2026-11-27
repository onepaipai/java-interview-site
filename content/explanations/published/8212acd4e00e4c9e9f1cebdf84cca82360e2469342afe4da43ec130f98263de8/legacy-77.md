<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银值班沙盘:OOM: Java heap space 告警→排查五步:确认 OOM 类型→获取 heap dump→分析 dominator tree→定位引用链→修复验证——jvm-advanced 77 题的完整版(内存泄漏/缓存/大对象分类排查)。

1. 排查五步:一,确认子类型(heap/Metaspace/native thread——路径不同,第 32 题);二,获取 dump(-XX:+HeapDumpOnOutOfMemoryError 或 jmap);三,MAT 分析(dominator tree+Leak Suspects);四,定位引用链;五,修复+压测验证。
2. heap dump 的分析:MAT(Memory Analyzer Tool)的 dominator tree(按"保留大小"排序——谁持有了最多的内存);shallow heap vs retained heap(对象自身大小 vs 可释放的总大小)——泄漏=retained heap 大但业务不需要的对象。
3. 没有 dump 的情况:-XX:+HeapDumpOnOutOfMemoryError 未设置(没 dump 可分析)→jcmd GC.heap_dump(运行时获取,如果进程还活着)或重启前尽快获取(jmap 可能失败如果堆太大)。

## 参考分析

### 第二步扩展① 机制:OOM 的"根因分类"

- 内存泄漏(对象不再使用但可达——静态集合/监听器/ThreadLocal/连接未关闭)+内存不足(数据量增长/缓存膨胀——需要扩容或优化)+大对象(一次性加载全量数据——流式处理替代)——三类根因的修复方向完全不同:泄漏→修代码、不足→扩容、大对象→改架构。

### 第二步扩展② 反例:OOM 排查的两种事故

- 事故一:OOM 后直接重启——没有获取 dump→证据丢失→无法定位根因→下次再发。
- 修复=HeapDumpOnOutOfMemoryError+重启前先 jmap。
- 事故二:MAT 分析只看大对象——大对象可能是缓存(正常),泄漏的小对象集合(百万 Entry)才是根因。
- 修复=dominator tree 看 retained heap(不是 shallow heap)。

### 第二步扩展③ 取舍:dump 的时机与方式

- OOM 时自动 dump(HeapDumpOnOutOfMemoryError——准确但可能 OOM 时 dump 失败)+运行时手动 dump(jcmd GC.heap_dump——进程存活时)+定期 dump 对比(泄漏的增量分析)——dump 的选择=进程状态(活/死)与时机(及时/事后)。

## 案例

### 第三步发散·验证与推演 验证:OOM 排查的走查核对

- 验证:OOM 复现→HeapDumpOnOutOfMemoryError 自动转储→MAT 分析→dominator tree 定位→引用链修复→压测确认——完整流程走查(第 19 题容器 OOMKilled 的 NMT 实测可复用)。
- OOM 子类型的区分排查(heap/metaspace/native 各不同)。
- 验证:OOM 排查的效率=从告警到根因定位的时长(演练计时)。

### 第三步发散·追问扩展 追问链:OOM 三刀

- **Q1：MAT 的 Leak Suspects 准确吗?**
  - 答：MAT 的 Leak Suspects=启发式分析(准确率高但有误报)——最终确认靠引用链的代码审查(不是只看 MAT 报告)。
- **Q2：OOM 与 GC overhead limit exceeded?**
  - 答：后者=GC 时间>98% 但回收<2%(GC 空转)——通常是泄漏的前兆(快 OOM 了);排查路径同 heap OOM。
- **Q3：NMT 怎么辅助?**
  - 答：NMT(native memory tracking)看堆外内存(元空间/线程栈/Code Cache/Direct)——heap OOM 走 dump,native OOM 走 NMT(第 19 题 JVM 实测:NMT 三种口径互不相等)。

## 总结点

1. 五步:类型→dump→MAT→引用链→修复
2. HeapDumpOnOutOfMemoryError 必配
3. 泄漏/不足/大对象三类根因
