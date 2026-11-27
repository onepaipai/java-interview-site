<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银导出沙盘:大列表 subList(0, 100) 后原列表其他元素无法回收(subList 持有原列表引用),且原列表结构变更后 subList 操作抛 CME——subList 是视图不是拷贝。

1. subList 返回视图:内部持有原列表引用+偏移量——原大列表因此无法 GC(内存滞留);原列表结构性修改(modCount 变化)后,subList 的任何操作抛 CME。
2. 两种正确用法:要独立副本→new ArrayList<>(list.subList(0, 100))(拷贝断开引用);要视图语义(原列表变化实时反映)→保留视图但明确不修改原列表结构。
3. 内存滞留的量级:subList(0,100) 持有 100 万元素的原列表——滞留 99.99 万个引用(不是 100 个)——长生命周期的视图是泄漏点。

## 参考分析

### 第二步扩展① 机制:视图的引用链与 modCount

- 引用链:subList 对象持有原 list 引用+fromIndex/toIndex——GC 可达性:subList 存活→原列表整体存活(即使业务只关心 100 个)。
- modCount:原列表 add/remove 改 modCount→subList 操作时校验(checkForComodification)→CME。
- 视图的写穿透:通过 subList 的 set/add/remove 直接改原列表(视图是窗口不是快照)——语义强大且危险。

### 第二步扩展② 反例:视图误用的两种事故

- 事故一,缓存滞留:服务的最近 100 条记录用 subList 视图存为字段——原列表(百万级)随服务常驻——堆里躺着 99 倍的冗余。
- 事故二,并发修改:线程 A 遍历 subList,线程 B 修改原列表——A 抛 CME(视图的 modCount 校验)——以为是线程安全问题(是视图语义问题,第 2 题 fail-fast 同族)。
- 修复:副本化(new ArrayList<>(视图))或换数据结构(Deque 滑窗,第 28 题)。

### 第二步扩展③ 取舍:视图 vs 副本的选择

- 视图的价值:零拷贝+写穿透(原列表的变化实时可见)——适合"短期、同线程、结构不变"的窗口操作(算法内部的分段处理)。
- 副本的价值:独立生命周期+并发安全——适合"长期持有、跨线程、导出"的场景。
- 判据:subList 的生命周期是否长于"下一次原列表结构变更"——长于即副本化。

## 案例

### 第三步发散·验证与推演 验证:视图行为的断言组

- 验证:内存滞留断言(持有 subList 字段的对象经 GC 后,原大列表仍可达——可达性分析或堆直方图)。
- CME 断言(原列表 add 后 subList.get 抛 CME)。
- 写穿透断言(subList.set 后原列表对应位变化)——三组固化视图语义。

### 第三步发散·追问扩展 追问链:subList 三刀

- **Q1：subList 的写穿透反向吗?**
  - 答：原列表的结构性插入/删除使视图失效(CME);set(替换)不影响 modCount(视图仍可用)——结构变更与值变更的区分。
- **Q2：不可变列表的 subList?**
  - 答：List.of 的 subList 仍不可变(视图继承不可变性)——不可变容器的视图安全(第 13 题)。
- **Q3：clear 的级联?**
  - 答：subList.clear() 删原列表对应区间(写穿透的极端形态)——区间删除的正确姿势(比循环 remove 高效,第 42 题 removeAll 同族)。

## 总结点

1. subList 是视图,引用链滞留原列表
2. 结构变更即 CME,值变更穿透
3. 长期持有先副本化
