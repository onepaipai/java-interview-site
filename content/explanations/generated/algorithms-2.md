<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银限流计数缓存沙盘:LFU 按访问频率淘汰,但多个键频次相同——必须再用 LRU 决出先后(频次内按最近使用),否则同频淘汰变成随机行为。

1. 结构=HashMap(key→Node)+频次分桶:每个频次 f 一个双向链表(桶内 LRU 序,最近使用的在尾);Node 存 key/value/freq;另维护 minFreq(当前最小频次)——get/put 命中后 freq+1 并从桶 f 摘下移入桶 f+1 尾部。
2. 同频淘汰规则:淘汰时从 minFreq 桶删链头(该频次内最久未用)——LFU 桶内退化成 LRU,这就是「LFU 为主、LRU 决胜」的双层序;minFreq 维护:新键入桶 1 时 minFreq=1;桶 f 清空且 f==minFreq 时 minFreq=f+1。
3. 复杂度:get/put O(1)(哈希定位+桶间摘除/追加均摊 O(1));空间 O(capacity+频次桶数);对比 LRU:LFU 保留历史热点(偶发扫描不冲掉),但对新键不友好(新键频次 1,刚进就可能是淘汰候选)。

## 参考分析

### 机制:minFreq 为什么能 O(1) 维护

淘汰只发生在 minFreq 桶——新键必进桶 1(此时 minFreq 至多是 1);命中使 freq+1 只会变相桶移入;某桶被清空只可能是它的元素全部升频——若它是 minFreq,minFreq 恰好 +1;三个事件都有确定方向,minFreq 不需要堆或重扫。类比楼层电梯:最低层只在有人下到一层或整层搬走时变化。

### 反例:LFU 的三种事故

事故一:同频不按 LRU——同频随机淘汰,行为不可复现,测试无法写;修复=桶内按访问序。事故二:历史频次永不衰减——一个键早期被狂访问后来冷了,频次仍高占着坑;工业实现(Caffeine)用频次衰减或 W-TinyLFU 的 CountMinSketch 近似。事故三:minFreq 漏更新——清桶后 minFreq 还指向空桶,下次淘汰取不到节点(NPE 或死循环)。

### 取舍:LFU 与 LRU 的适用分界

访问频率稳定的场景(热点账户/热商品)LFU 命中率高;突发批量扫描场景 LFU 抗污染;新键快速上位场景 LRU 更好——混合需求正是 Caffeine W-TinyLFU 的动机(窗口 LRU 抗突发+频率过滤抗污染,legacy/111 取舍同源)。手写 LFU 面试考双层序,O(1) 版考 minFreq 维护。

## 案例

### 验证:双层序断言组(本机可复跑)

验证:同频 LRU 断言(A/B/C 各访问 1 次→淘汰 A(最早);再访问 B 两次→淘汰 C(频次 1<A 频次 2?否——A 仍 1 次,淘汰 A)——构造频次交叉用例核对);minFreq 断言(全清桶后 minFreq 递进正确);升频断言(命中后节点从桶 f 消失出现在桶 f+1 尾);衰减对照(说明手写版无衰减的局限)。预期:淘汰序列与双层序定义完全一致。

### 追问链:LFU 三刀

一刀:O(1) LFU 的空间代价——每频次一个桶+每节点四个指针,容量大时内存放大明显;近似版(CountMinSketch+时分桶)用精度换内存。二刀:频次计数什么算「访问」——get 命中?写也算?写不加频次会误淘汰热写键,契约要先定。三刀:分布式 LFU——本地 LFU+一致性哈希分片(第 4 题 distributed),或交给 Redis 的 allkeys-lfu(样本近似)。

## 总结点

1. LFU 为主,桶内 LRU 决胜
2. minFreq 三事件定向维护
3. 历史频次要衰减,否则冷键占坑
