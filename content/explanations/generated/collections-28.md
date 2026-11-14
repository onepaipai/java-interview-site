<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayDeque.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银解析沙盘:括号匹配用 java.util.Stack(Vector 子类,方法 synchronized)——性能与设计双输:Stack 继承 Vector 的 get(i)(破坏栈语义)、全方法锁(单线程也付锁开销)。Deque(ArrayDeque)是官方推荐替代。

1. Stack 的设计遗留:extends Vector(继承 get/insert 等非栈方法——栈语义被破坏:可以从中间插入)+所有方法 synchronized(单线程的锁开销,锁消除也难保证)+容量翻倍扩容。
2. ArrayDeque 的优势:数组双端队列(无锁单线程场景/两端 O(1) 摊销/无栈语义破坏/容量 1.5-2 倍扩容循环复用)——作为栈(push/pop)与队列(offer/poll)均优于 Stack/LinkedList。
3. 接口的演进:Stack 的 push/pop 保留但弃用倾向;Deque 接口(Java 6+)统一双端语义(addFirst/pollLast...)——新代码一律 Deque。

## 参考分析

### 机制:Vector 遗留与 ArrayDeque 设计

Stack 的问题:继承 Vector(公开 elementAt/set——栈被旁路)+方法同步(历史兼容,去不掉)+迭代顺序反直觉(iterator 从底到顶,与 pop 序相反)。ArrayDeque:循环数组(头尾指针,满时扩容)+无锁(单线程)+两端 O(1)——push=addFirst,pop=removeFirst;内存连续(局部性,第 9 题);容量循环利用(出队后空间复用,不扩容直到真满)。

### 反例:Stack 的两种实际伤害

伤害一,语义旁路:代码里 stack.insertElementAt(x, 0)(Vector 方法)——栈的 LIFO 被破坏(逻辑 bug 难查)。伤害二,锁开销:高频 push/pop(解析器热点)——synchronized 的成本(偏向锁移除后,每次加解锁真实付费,第 21 题 JVM)——单线程解析器平白付锁税。两条:换 ArrayDeque 全消(语义纯+零锁)。

### 取舍:栈场景的容器选择

ArrayDeque:默认(单线程栈/队列)。LinkedDeque(手写/第三方):需要 O(1) 任意移除(带节点引用的 LRU,第 6 题)。Stack:仅遗留代码兼容。并发栈:ConcurrentLinkedDeque(无锁)/BlockingDeque(生产消费)——并发场景另选。ArrayDeque 的 null 禁止:deque.addFirst(null) 抛 NPE——null 的空间留给"空"的语义(第 18 题 null 政策一致)。

## 案例

### 验证:性能与语义的断言组

验证:吞吐断言(单线程千万次 push/pop:ArrayDeque vs Stack 的耗时——锁开销可见);语义断言(ArrayDeque 无 get(i)(Deque 接口无此方法)——编译期禁旁路);复用断言(ArrayDeque 出队后空间复用(不立即扩容))——三组固化替代的收益。

### 追问链:Deque 三刀

一刀:"ArrayDeque 的容量?"——构造传容量(避免扩容,第 10 题)——默认 16,2 的幂(循环掩码);扩容翻倍(循环数组重建)。二刀:"迭代顺序?"——Deque iterator 从头到尾(与 pop 序一致——比 Stack 的反直觉迭代友好);descendingIterator 反向。三刀:"与 recursion 的转换?"——显式栈替代递归(深递归 StackOverflow——栈帧换堆对象,第 18 题线程栈)——ArrayDeque 是递归转迭代的标准工具。

## 总结点

1. Stack 是 Vector 遗留,Deque 是正解
2. 语义纯(无旁路)+零锁
3. 递归转迭代也用它
