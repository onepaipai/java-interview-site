<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [OpenJDK 设计说明 · 1](https://openjdk.org/jeps/421)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/Cleaner.html.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：一个旧库依赖 finalize 关闭文件句柄，偶发句柄耗尽。从执行时机、复活风险与性能拖累三个角度解释 finalize 为什么被废弃（JEP 421），以及存量代码的迁移路径。

1. 时机无保证：finalize 由引用队列在 GC 后调度执行，对象可能长期不回收，"兜底释放"退化为"也许释放"，句柄耗尽正是这么来的。
2. 复活风险：finalize 里 this 又被存到静态字段，对象"死而复生"，且复活后 finalize 不再执行第二次保障语义混乱。
3. 拖累回收：带 finalize 的对象至少经历两轮 GC（入队、执行后才能真正回收），队列积压会放大内存压力；JEP 421 在 Java 18 将其标记废弃，Java 17 仍可用但不应新增。

## 参考分析

### 机制：finalize 的执行链路决定了它不可靠

对象不可达后进入 finalizer 引用队列，由单线程、低优先级的 Finalizer 线程逐个执行——单线程意味着所有待终结对象排同一条队，一个慢 finalize 阻塞整条释放链（句柄耗尽的直接机制），低优先级意味着与业务抢核时被压制；线程调度、队列长度、异常吞没都发生在"你的代码之外"。JEP 421 的版本事实：Java 18 起 --finalization=disabled 可关停 finalization 机制，为最终移除铺路——17 上"仍可用但不应新增"。类比让清洁工下班顺路带走垃圾：垃圾会不会被带走取决于清洁工几点来、路上堵不堵，而你无法验收。正确的保障是把"关闭"做成确定性动作（try-with-resources）。

### 反例：句柄耗尽的事故链

高频打开文件但不显式 close，依赖 finalize 兜底；分配速率高时 finalizer 队列积压，句柄释放速度跟不上创建速度，最终 "too many open files"。同类事故也出现在数据库连接与 socket。定界证据：jstack 中 Finalizer 线程长期忙碌、堆里有大量等待终结的对象。

### 取舍：迁移到 Cleaner 与显式关闭的双保险

存量代码迁移优先级：第一显式 close + try-with-resources（确定性）；第二用 Cleaner 注册兜底回调（虚引用实现，无复活问题，仍不保证及时）；finalize 仅作为过渡保留。资源类设计原则从此固化：谁分配谁关闭，兜底只是保险丝不是开关。

## 案例

### 对照操作：finalize 与 close 的回收轮次对照

教学验证：两个资源类各持一个文件句柄，一个依赖 finalize、一个 try-with-resources，各循环 10 万次打开关闭。预期：显式关闭版本句柄峰值稳定；finalize 版本堆里积压待终结对象、句柄计数攀升，-Xlog:gc 可见回收压力。实验可复跑，是废弃 finalize 的最短论证。

### 追问：Cleaner 会不会重蹈覆辙

不会复活问题（虚可达后 get 恒 null），但仍受"GC 时机 + 队列消费"约束，不能当及时释放用。Cleaner 回调要避免引用宿主对象（否则永远虚不可达），写成静态方法或 lambda 不捕获 this。它与 finalize 的关系是"更安全的兜底"，不是"更及时的保障"。

## 总结点

1. finalize 是运气，close 是契约
2. 两轮 GC 才走，队列积压句柄空
3. Cleaner 兜底，不顶正岗
