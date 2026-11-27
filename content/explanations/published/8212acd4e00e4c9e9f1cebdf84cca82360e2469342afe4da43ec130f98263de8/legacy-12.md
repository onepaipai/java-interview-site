<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedList.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账单沙盘:按月拉取 10 万条流水——ArrayList(随机访问/尾部追加快)与 LinkedList(头插/中间插快)的选型差异;ArrayList 满了怎么扩容(1.5 倍+复制)。

1. ArrayList:动态数组——随机访问 O(1)(下标直达)、尾部均摊 O(1);中间插删 O(n)(移动元素);内存连续(CPU 缓存友好)。LinkedList:双向链表——头尾插删 O(1),随机访问 O(n)(从头/尾遍历),每节点额外 prev/next 指针开销。
2. 扩容:容量不足时 newCapacity=oldCapacity+(oldCapacity>>1)(1.5 倍)——Arrays.copyOf 复制到新数组(O(n) 一次成本,均摊后每元素 O(1));扩容时机=add 时 size==capacity;建议预估容量构造(initialCapacity)避免反复扩容。
3. 选型:查询为主/尾部追加→ArrayList(绝大多数场景);频繁头插/用作队列栈→LinkedList(或 ArrayDeque——数组实现的双端队列,性能优于 LinkedList)。

## 参考分析

### 第二步扩展① 机制:1.5 倍的取舍

- 1.5 倍=扩容频率与内存浪费的折中:翻倍(2 倍)浪费上限大,线性(每次+1)扩容 O(n) 次数多。
- 1.5 倍下扩容次数 O(log n) 且旧数组可复用部分空间(1.5 倍扩出来的新数组与旧数组重叠,HotSpot 可就地收缩)。
- 实测:扩容 10 次≈容量 40 倍增长。

### 第二步扩展② 反例:List 误用的两种事故

- 事故一:LinkedList 做随机访问——循环 get(i) 每次 O(n)→总 O(n²)(百万数据秒级变分钟级)。
- 修复=ArrayList 或迭代器。
- 事故二:不预估容量——10 万次 add 触发约 24 次扩容(每次全量复制)。
- 修复=new ArrayList<>(expectedSize)。

### 第二步扩展③ 边界:remove 与 fail-fast

- ArrayList.remove 按索引 O(n)(移动后续元素)。
- 遍历中 remove 抛 ConcurrentModificationException(fail-fast,第 16 题)。
- LinkedList 遍历删除用 iterator.remove O(1)。

## 案例

### 第三步发散·验证与推演 验证:扩容的实测走查

- 验证:反射读 elementData.length——add 第 11 个元素时 10→15,16 个时 15→22(1.5 倍链)。
- System.arraycopy 复制断言(旧数组内容不变)。
- 随机访问耗时对照(ArrayList get(百万级)毫秒 vs LinkedList 秒级)——集合模块 C 系列实验可复用。
- 预期:1.5 倍链与源码 grow() 一致。

### 第三步发散·发散要点 追问链:List 三刀

- **追问①·ArrayDeque vs LinkedList**：数组环形缓冲 vs 链表——双端队列首选 ArrayDeque(缓存友好+无节点开销)
- **追问②·CopyOnWriteArrayList**：写时复制(读无锁,写贵)——读多写少(并发基础)
- **追问③·subList 视图**：backed by 原数组(改原数组影响视图,序列化风险)

## 总结点

1. ArrayList 查询快,LinkedList 插删快
2. 扩容 1.5 倍+copyOf 复制
3. 预估容量避免反复扩容
