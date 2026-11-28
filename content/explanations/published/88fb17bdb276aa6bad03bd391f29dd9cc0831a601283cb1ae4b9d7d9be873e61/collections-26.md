<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银任务调度沙盘:PriorityQueue(优先级队列)iterator 遍历输出无序(堆的数组布局)——只有出队(poll)才有序。用堆的数组结构与有序性的关系说明"堆≠有序列表"。

1. 堆的结构:数组表示的完全二叉树(parent=i/2,children=2i,2i+1)——只保证"父≤子"(堆序),不保证"层间有序"(兄弟无序)——数组遍历顺序=树的层序=非排序序。
2. 有序的来源:poll() 每次取堆顶(最小/最大)——逐个 poll 才有序(每次 O(log n) 调整);整体排序=Arrays.sort(PQ.toArray())(额外 O(n log n))。
3. 并发的缺失:PriorityQueue 非线程安全——并发场景 PriorityBlockingQueue(内部加锁,堆序不变,第 23 题)。

## 参考分析

### 第二步扩展① 机制:堆序与迭代序的差异

- 堆序:每个父节点优先级≥子节点(小顶堆)——保证:堆顶是最小。
- 不保证:数组下标序=优先级序。
- 迭代:for (Task t : pq) 按数组下标(树的层序)——例如数组 [1, 3, 2, 5, 4](堆序成立)迭代输出 1,3,2,5,4(非排序)。
- 有序获取:poll 循环(O(n log n) 总)——每次 poll 触发 siftDown 调整。

### 第二步扩展② 反例:把 PQ 当有序列表的三种错

- 错一,迭代当排序:iterator 遍历当有序流用(输出乱序,bug)。
- 错二,peek 的误用:peek 只看堆顶(最高优先级),不代表"下一个处理的都按序"(并发 peek 后 poll 之间状态变)。
- 错三,迭代中修改:迭代时 poll/add——CME(与 ArrayList 同族,堆的 modCount)。
- 修复:需要有序遍历→poll 循环或转 TreeMap(第 7 题)/需要排序快照→sort(toArray)。

### 第二步扩展③ 取舍:堆 vs 有序结构的选型

- 堆:只关心"下一个最高优先级"(调度器/Top K,第 35 题)——O(log n) 插入+O(1) 查看顶。
- TreeMap:需要全序遍历+范围(第 7 题)——O(log n) 全操作。
- 排序列表:静态数据(一次性排序,查询多)——堆的优势在"动态插入+只取顶"。
- 场景问句:每次需要几个元素?(堆顶 1 个→堆。
- 全量有序→排序/TreeMap)。

## 案例

### 第三步发散·验证与推演 验证:迭代无序的断言组

- 验证:无序断言(插入 1-10 随机序,iterator 遍历输出非排序序——堆数组实证)。
- poll 有序断言(poll 循环输出严格有序)。
- 堆序断言(数组满足堆性质但非排序序)——三组固化"堆≠有序列表"。
- 并发形态(PriorityBlockingQueue)的迭代弱一致单列。

### 第三步发散·追问扩展 追问链:堆三刀

- **Q1：Top K 为什么用堆?**
  - 答：固定大小小顶堆(第 35 题):维护 K 个最大——新元素与堆顶比较,O(log K)——全排序 O(n log n) 的优化(只留 K 个)。
- **Q2：元素的可比较性?**
  - 答：同 TreeSet(compare 契约,第 8 题):比较器不一致/抛异常=堆结构破坏——元素比较的纪律同源。
- **Q3：堆的删除?**
  - 答：remove(Object) O(n) 定位+O(log n) 调整——随机删除昂贵(堆不支持高效任意删除)——需要任意删除用 TreeMap。

## 总结点

1. 堆只保堆序,迭代非排序
2. poll 逐个才有序
3. Top K 的固定堆是经典应用
