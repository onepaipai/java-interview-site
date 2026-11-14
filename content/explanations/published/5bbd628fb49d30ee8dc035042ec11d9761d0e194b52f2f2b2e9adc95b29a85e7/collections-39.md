<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [事件溯源设计说明 · 1](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银索引沙盘:userId→多个订单 ID(一主多值)——Map<String, List<String>> 手工包装(check-then-add 竞态)+值 List 可变共享——线程安全多值映射的三层:Map<String, CopyOnWriteArrayList> 手工、CHM.compute 原子、Guava Multimap(语义清晰)。

1. 手工包装的坑:computeIfAbsent 原子返回 List,但 List.add 无锁——两线程并发 add 即竞态(第 2 题),值容器也要线程安全(CopyOnWriteArrayList)或全路径加锁。
2. CHM 原子层:compute(k, (k, list) -> {list.add(v); return list;})——整个读改写在桶锁内(List 的修改在锁内=安全)——但锁内做重活(第 17 题禁忌)——值容器的选择决定锁内成本。
3. Guava Multimap:ArrayListMultimap/HashMultimap(语义清晰,非线程安全)+Multimaps.synchronizedMultimap(包装)——语义层解决"一主多值"的抽象,线程安全靠包装或 ImmutableMultimap。

## 参考分析

### 机制:三层实现的安全面

层一,compute+线程安全 List:compute(k, (k,l) -> {l.add(v); return l;})——桶锁内修改 CopyOnWriteArrayList(COW 的写锁与桶锁嵌套——锁顺序固定无死锁)——最通用。层二,computeIfAbsent+并发 List:get 到的 List 直接 add(COW 的 add 自带锁)——computeIfAbsent 只保证"List 创建原子",add 的安全由 COW 保证——两层各管一段。层三,Guava Multimap+synchronized 包装——语义最优,性能一般(全表锁)。

### 反例:多值映射的两种事故

事故一,ArrayList 竞态:computeIfAbsent 返回 ArrayList,两线程并发 add——内部数组竞态(元素丢失/数组越界异常,第 2 题HashMap 并发同构)。事故二,值泄漏:返回内部 List(调用方 add/clear 直接改索引,第 43 题 banking 防御返回同题)——多值映射的值容器也是"内部状态"。修复:返回只读视图(UnmodifiableList/拷贝)——写走显式接口。

### 取舍:多值映射的形态选择

形态一,CHM+COW:并发读多写少(索引:读多,注册少)——读零锁。形态二,CHM+compute+ArrayList:写多读少(桶锁内 add)——读要同步(遍历时拷贝)。形态三,Guava Multimap+包装:业务语义复杂(分组/翻转/遍历——Multimap 的丰富 API)。判据:读写比+语义复杂度——语义简单选一或二,语义丰富选三。

## 案例

### 验证:线程安全的断言组

验证:并发 add 断言(多线程同键 add,N 次——最终 size=N 零丢失——对照 ArrayList 形态的丢失);防御返回断言(返回视图的修改被拒);读写比断言(COW vs compute 两形态的吞吐对照)——三组固化多值映射的安全与性能。

### 追问链:多值三刀

一刀:"值的删除?"——从 List 删单值(compute 内 remove)+List 空后删键(空 List 的清理,防 Map 膨胀——第 13 题 banking 无上限同构)——值的增删要联动键的存在性。二刀:"多值的排序?"——值 List 内排序(时间序,第 34 题)——List 的排序线程安全(拷贝排序或 COW)——多值的顺序语义显式。三刀:"与索引的关系?"——多值映射=内存索引(第 2 题banking 投影的内存形态)——索引的一致性(与事实源的同步,第 47 题)——多值映射常是"投影",归属与失效要清楚。

## 总结点

1. computeIfAbsent 创建原子,List add 要并发安全
2. compute 全程桶锁,锁内勿重活
3. Guava Multimap 管语义,包装管安全
