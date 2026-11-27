<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银共享缓存沙盘:多线程读写账户表——HashMap(非线程安全)/Hashtable(全表锁)/ConcurrentHashMap(CAS+桶级锁)——并发度与性能的代际差异。

1. HashMap:非线程安全(允许一个 null key/null value,JDK8 尾插);Hashtable:线程安全但全表一把锁(get/put 都 synchronized)——读写互斥,并发度 1;已过时。ConcurrentHashMap:JDK8 CAS+synchronized 锁单个桶头——并发度=桶数,读无锁(volatile)。
2. CHM JDK7 vs JDK8:JDK7 Segment 分段锁(默认 16 段,并发度=段数,二次哈希);JDK8 取消分段——CAS 空桶+synchronized 链头 Node,粒度从段细化到桶;size 用 CounterCell 分片计数(LongAdder 思路)。
3. null 语义:HashMap 允许 null key/value;Hashtable 与 CHM 都禁止(null 会 NPE)——CHM 禁止的原因:并发下 containsKey(key)==false 与 get(key)==null 无法区分(key 不存在 vs 映射为 null 的歧义)。

## 参考分析

### 第二步扩展① 机制:CHM 为什么读不需要加锁

- Node.val 与 Node.next 都是 volatile——读线程看到最新值。
- 数组引用 volatile 保证扩容后可见。
- 写侧:空桶 CAS 放入,非空 synchronized 锁桶头(锁的是链表头 Node,不是数组槽)——不同桶互不影响,并发度接近桶数。

### 第二步扩展② 反例:并发容器的两种事故

- 事故一:HashMap 多线程 put——数据丢失或(JDK7)扩容死循环。
- 修复=CHM。
- 事故二:Collections.synchronizedMap 当高性能用——所有操作一把互斥锁(与 Hashtable 同级)。
- 高并发必须 CHM。
- 事故三:CHM 复合操作不原子——先 get 再 put 的检查-操作仍有竞态,用 putIfAbsent/computeIfAbsent。

### 第二步扩展③ 取舍:同步容器的演进逻辑

- Hashtable(全表锁)→synchronizedMap(包装,同粒度)→分段锁(JDK7 CHM)→桶级锁+CAS(JDK8 CHM)——锁粒度逐代细化。
- 选型:单线程 HashMap,并发 CHM,排序并发 ConcurrentSkipListMap(无并发 TreeMap)。

## 案例

### 第三步发散·验证与推演 验证:三者并发的实测走查

- 验证:并发压力断言(8 线程×10 万 put:HashMap 丢数据/CHM 无丢失)。
- 并发度断言(CHM 不同桶并行,单桶串行——计时对照)。
- null 断言(HashMap 可 null,CHM 抛 NPE)。
- 复合操作断言(putIfAbsent 幂等 vs get+put 竞态)——集合模块 C 系列并发实验可复用。
- 预期:CHM 无丢失且吞吐显著高于 Hashtable。

### 第三步发散·发散要点 追问链:CHM 三刀

- **追问①·size 弱一致**：CounterCell 分片+sumCount 无全局锁(返回瞬时近似值)
- **追问②·迭代器弱一致**：创建时不抛 CME(fail-fast 反面),可能读到旧值
- **追问③·computeIfAbsent 死锁风险**：同桶嵌套 compute(JDK9 修复递归更新抛 IllegalStateException)——嵌套计算换普通 put

## 总结点

1. Hashtable 全表锁已过时
2. CHM=CAS+桶级锁,读 volatile 无锁
3. CHM 禁 null:并发歧义
