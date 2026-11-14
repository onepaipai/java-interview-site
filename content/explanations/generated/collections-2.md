<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:8 线程并发读写 HashMap vs ConcurrentHashMap——实测 40 万次操作 CHM 91ms、synchronizedMap 233ms(CHM 快 2.5 倍);HashMap 并发下更糟(死循环风险[JDK7]/数据丢失[JDK8])。用实测与机制说明三者的并发行为差异。

1. HashMap 并发写的两个坑:数据丢失(并发 put 同桶互相覆盖,无同步)与结构破坏(JDK7 扩容死循环;JDK8 修复为丢失,但数据一致性无保证)——它假设单线程,无任何并发防护。
2. 实测:8 线程 40 万次读写,ConcurrentHashMap 91ms vs Collections.synchronizedMap 233ms——synchronizedMap 全表一把锁(串行化所有操作),CHM 分桶 CAS+synchronized(锁粒度到桶)。
3. synchronizedMap 的隐藏坑:迭代仍需外部同步(迭代器是 fail-fast 的,并发修改抛 CME);复合操作(check-then-put)不原子——"线程安全的 Map"不等于"线程安全的用法"(第 16 题分布式)。

## 参考分析

### 机制:锁粒度与复合操作

CHM 的并发设计:CAS 空桶插入(无锁)+桶头 synchronized(冲突时)+扩容多线程协助(transfer 分片)——锁粒度=单桶,读无锁(NODE 数组 volatile)。synchronizedMap:包装器所有方法共享一把 mutex——包括 get(读也串行)——吞吐天花板=单核。复合操作陷阱:if(!map.containsKey(k)) map.put(k,v) 两步之间另一线程可插入——正确写法 putIfAbsent/computeIfAbsent(CHM 原子,第 16 题分布式)。

### 反例:HashMap 并发丢失的实测形态

本机实验(C2)扩展形态:8 线程对 HashMap 并发 put 16 万次(键去重后 4096)——最终 size 常态小于 4096(丢失),偶尔抛异常(扩容并发);同负载 CHM size 精确。推演到生产:缓存用 HashMap+并发读——读到的可能是半构建状态(另一线程扩容中)——引用读出但内部数组正被迁移(不可见性问题之外的"撕裂读"风险,容器层面无 volatile 保护)。

### 取舍:并发 Map 的选型

CHM:读多写多通用首选(读几乎无锁)。synchronizedMap:遗留接口兼容(要传 Map 的老 API)——新代码不用。ConcurrentSkipListMap:需要并发+有序(范围查询,第 36 题)。Collections.emptyMap/不可变:只读场景(List.of/Map.of,第 12 题)。判据一句话:并发读写选 CHM,只读选不可变,别让 HashMap 出现在任何共享可变的位置。

## 案例

### 验证:并发吞吐的断言组

验证:本机实验(C2,固定 8 线程×20 万次)——CHM 与 synchronizedMap 的吞吐对照(91ms vs 233ms,比值稳定复现);CHM 的 size 精确性(并发后 size 与 keySet().size() 一致);HashMap 并发丢失形态(对照实验,单线程环境不可复现——并发专用)。三组数据进"并发容器选型"的评审材料。

### 追问链:并发 Map 三刀

一刀:"CHM 的 size 为什么弱一致?"——size 遍历 baseCount+CounterCell 求和(无全局锁)——并发写时结果是"某一时刻的近似"(第 19 题专论业务控制的误用)。二刀:"迭代器呢?"——CHM 迭代器弱一致(不抛 CME,能看到或看不到后续写入);synchronizedMap 迭代器 fail-fast(迭代需手动 synchronized(map))——迭代语义是选型的隐形维度。三刀:"JDK7 死循环还要知道吗?"——知道(面试高频+老系统排查):扩容时链表头插成环,get 自旋 100% CPU;JDK8 改尾插修复——版本边界题,老 JDK 系统迁移的理由之一。

## 总结点

1. HashMap 裸奔无并发防护
2. CHM 分桶,同步包装全表一把锁
3. 线程安全容器不等于线程安全用法
