<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:容量 3 的 LRU 缓存——访问 1 后插入 4,实测 keys=[3,1,4](2 被淘汰):LinkedHashMap 的 accessOrder+removeEldestEntry 就是现成的 LRU(本机实验)。

1. 实现机制:双向链表串起所有条目(挂在 HashMap 的节点上)——accessOrder=true 时每次 get/put 把节点移到链尾;removeEldestEntry 钩子在插入后判断(返回 true 删链头)——访问序+淘汰钩子=LRU 全套(本机实测 keys=[3,1,4])。
2. 线程安全:LinkedHashMap 非线程安全——并发 LRU 要加锁(粒度=整表,LRU 操作互相排斥)或换 Caffeine(无锁/分段/更准的时钟淘汰)——并发场景 LinkedHashMap 只适合低并发原型。
3. get 也会改结构(accessOrder 模式):迭代顺序被 get 影响——遍历与 LRU 的组合要小心(迭代中 get 其他键=CME 风险,modCount 变化)。

## 参考分析

### 机制:双向链表与访问排序

结构:每个 Entry 多 before/after 指针(双向链表贯穿全表);insertion 模式(默认):按插入序;access 模式:put/get 把节点移尾。淘汰钩子:removeEldestEntry(eldest) 在每次插入后调用(返回 true 删链头=最久未访问)——LRU=accessOrder(true)+重写钩子(容量判断)。本机实验:容量 3,put 1/2/3→get(1)(1 移尾)→put 4(触发钩子,删链头=2)→keys=[3,1,4] 实测。

### 反例:LRU 实现的两个常见错误

错误一,手写双向链表+HashMap:重新发明 LinkedHashMap(链表指针的边界 bug:头尾/单节点/删除中间)——用现成的。错误二,insertion 模式当 LRU:accessOrder 默认 false(插入序)——get 不改变顺序,"最近访问"失效——淘汰错对象(淘汰的是最早插入而非最久未访问)。两错误的根源:不知道 accessOrder 参数的存在或语义。

### 取舍:LinkedHashMap LRU vs Caffeine

LinkedHashMap LRU:零依赖/简单/非线程安全/纯 LRU(无过期/无权重/无统计)——低并发小缓存。Caffeine:并发(无锁读)/W-TinyLFU(命中率优于纯 LRU,防扫描污染)/过期/权重/统计——生产缓存默认选它。迁移路径:原型用 LinkedHashMap 验证语义,生产换 Caffeine(接口相近)——语义原型与生产实现的分层(第 15 题分布式 BFF 思想同构:原型与生产分层)。

## 案例

### 验证:LRU 行为的断言组

验证:本机实验断言(keys=[3,1,4],2 被淘汰——访问序生效);淘汰钩子断言(容量 3 的边界:第 4 次插入触发);get 影响序断言(accessOrder=true 下 get 改变迭代序;false 下不变——两模式对照)——三组固化 LRU 语义,进缓存组件的单测。

### 追问链:LRU 三刀

一刀:"removeEldestEntry 的时机?"——put 后(插入新条目时)调用,get 不触发(即使移位)——淘汰只发生在"新增"——容量满后 get 不会腾空间。二刀:"LRU 的扫描污染?"——全量扫描把热点全移尾(冷数据反成"最近访问")——Caffeine 的 TinyLFU 用频次统计抗污染;LinkedHashMap LRU 无此防护(高频遍历的缓存会失效,第 15 题 distributed)。三刀:"removeEldestEntry 里能做什么?"——只判断(返回布尔);在钩子里做 IO(写回数据库)=回调里做重活(第 11 题 afterCommit 同构禁忌)——淘汰的写回应异步化。

## 总结点

1. 双向链表挂节点,accessOrder 定序
2. 钩子管淘汰,淘汰只在插入时
3. 生产缓存用 Caffeine,原型用 LinkedHashMap
