<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银列表沙盘:"LinkedList 插入删除 O(1) 所以频繁增删用它"——错误:随机位置插入要先遍历定位(O(n)),且每节点分配+缓存不友好(第 5 题局部性);正确比较=按操作画像+内存局部性实测。

1. 真实的操作成本:ArrayList 随机访问 O(1)+尾部增删摊销 O(1)+中间插删 O(n)(但 System.arraycopy 内存搬移极快);LinkedList 头尾增删 O(1)+随机访问 O(n)(每次从头走链)+中间插删=定位 O(n)+改指针 O(1)。
2. 局部性碾压理论复杂度:ArrayList 连续内存(CPU 预取);LinkedList 每节点独立堆分配(指针跳转,缓存未命中)——第 5 题遍历 3 倍差距的同源;实践测量:LinkedList 的"理论 O(1) 中间插入"常输给 ArrayList 的 arraycopy(现代 CPU 搬移连续内存极快)。
3. 选型结论:默认 ArrayList(几乎总是);LinkedList 只在"两头操作+不随机访问+元素大"的窄场景(Deque 语义——而 ArrayDeque 也通常更优,第 28 题)。

## 参考分析

### 机制:理论复杂度与实测的背离

中间插入的实测:ArrayList 100 万元素中间插 1 万次(arraycopy 搬移 50 万元素≈微秒级/次)vs LinkedList(遍历定位 50 万节点×指针跳转≈毫秒级/次)——理论 O(n) vs O(n) 相同,常数差 10-100 倍(局部性+分配)。尾插入:ArrayList 摊销 O(1)(扩容时偶发抖动,第 10 题)vs LinkedList O(1)(每节点分配)——稳态 ArrayList 更快,抖动看场景。随机访问:O(1) vs O(n)——不可比。

### 反例:教科书选型的两种浪费

浪费一,LinkedList 做队列:头删 O(1) 不错——但 ArrayDeque 同样 O(1) 且数组连续(更快更省内存)——LinkedList 唯一优势=允许 null+可做 List(Deque 接口已覆盖队列需求,第 28 题)。浪费二,LinkedList 做"频繁中间删":删除要定位(遍历)——除非持有节点的引用(LinkedList 无公开节点句柄!ListItr 私有)——定位成本无法省略。两条的结论:LinkedList 的适用面比教科书窄得多。

### 取舍:列表选型的决策树

决策树:随机访问多?→ArrayList。两头操作(栈/队列)?→ArrayDeque(第 28 题)。中间频繁插删且持有迭代器位置?→LinkedList(窄)。只读?→List.of(第 12 题)。默认:ArrayList——"默认 ArrayList,有证据才换"是列表的务实纪律(证据=操作画像的实测,第 50 题避免伪结论)。

## 案例

### 验证:性能画像的断言组

验证:四操作对照实测(尾部增/中间插/随机访问/遍历,10 万元素级)——ArrayList vs LinkedList 的各操作耗时表(局部性效应可见);容量预分配断言(new ArrayList<>(n) 免扩容,第 10 题);结论=默认 ArrayList 的数据支撑——实测表进团队选型指南。

### 追问链:列表选型三刀

一刀:"ArrayList 的扩容抖动?"——1.5 倍扩容(本机 C2 轨迹:10→15→22→33→49→73→109→163→244)——大列表的扩容 copy 是尾延迟来源(第 10 题专论;预分配治)。二刀:"removeIf 的优势?"——ArrayList.removeIf 内部位图标记+单次压缩(O(n) 一次搬移)vs 循环 remove(每次 O(n) 搬移,O(n²) 总)——批量删除必用 removeIf。三刀:"线程安全列表?"——CopyOnWriteArrayList(读多写少,第 21 题)/Collections.synchronizedList(全锁)/CHM 思路的分段——按读写比选(第 21 题)。

## 总结点

1. 默认 ArrayList,证据才换
2. 局部性碾压理论复杂度
3. 批量删除用 removeIf
