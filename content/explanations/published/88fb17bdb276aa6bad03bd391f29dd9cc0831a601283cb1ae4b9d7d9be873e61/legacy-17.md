<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/TreeMap.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银报表沙盘:按账户等级排序输出(TreeMap)与按访问热度排序(LinkedHashMap 访问序)——两者都在 HashMap 之上加了结构:红黑树与双向链表。

1. TreeMap:红黑树实现——按 key 排序(自然序或定制 Comparator),get/put/remove O(log n);支持范围查询(floorKey/ceilingKey/subMap/headMap/tailMap);key 必须可比较,判重靠 compare==0(不走 hashCode/equals)。
2. LinkedHashMap:HashMap+双向链表串联所有 Entry——保序两种:插入序(accessOrder=false,默认)与访问序(true,get/put 移到链尾);重写 removeEldestEntry 可做 LRU(legacy/111 同源);其余判重/扩容行为与 HashMap 一致。
3. 选型:需要排序或范围查询→TreeMap;需要保持插入顺序或 LRU→LinkedHashMap;纯查找→HashMap(O(1) 最快);并发排序→ConcurrentSkipListMap(跳表,无并发 TreeMap)。

## 参考分析

### 第二步扩展① 机制:两种结构的代价差在哪

- TreeMap 每次插入要在红黑树中旋转着色(O(log n)),换来全局有序。
- LinkedHashMap 在 HashMap 的 O(1) 上只多做链表指针维护(每个条目多两个指针)——代价近零,换来遍历顺序稳定。
- 类比:TreeMap 是随时保持书架按字母排好,LinkedHashMap 是书按放进来的顺序串成一条绳。

### 第二步扩展② 反例:有序容器的两种事故

- 事故一:TreeMap 的 key compareTo 与 equals 不一致——compare 认为相等但 equals 不等→put 覆盖丢失数据。
- 修复=比较字段与相等字段一致。
- 事故二:LinkedHashMap 并发使用——非线程安全(同 HashMap)。
- LRU 缓存并发用 Caffeine(W-TinyLFU,legacy/111 取舍)。

### 第二步扩展③ 边界:accessOrder 的隐性行为

- accessOrder=true 时 get 也会改链表结构(移到尾部)——遍历中 get 同一 key 会影响遍历序。
- removeEldestEntry 在 put 后回调(删链头 eldest)——淘汰逻辑只看容量,要 TTL 需手写(legacy/111 取舍)。

## 案例

### 第三步发散·验证与推演 验证:有序性的实测走查

- 验证:TreeMap 断言(乱序 put→keySet 迭代有序。
- floorKey/ceilingKey 边界)。
- LinkedHashMap 断言(插入序遍历=put 顺序。
- accessOrder=true 时 get A 后 A 移尾——legacy/111 反射读链表同源)。
- compare-equals 不一致断言(put 覆盖丢数据复现)——三组固化有序语义,本机可复跑。

### 第三步发散·发散要点 追问链:有序三刀

- **追问①·NavigableMap 接口**：TreeMap 的范围查询全集(descendingMap/navigableKeySet)
- **追问②·ConcurrentSkipListMap**：跳表(概率平衡,平均 O(log n)),替代并发场景红黑树(旋转难并发)
- **追问③·LinkedHashMap 与 LRU 的关系**：accessOrder+removeEldestEntry 五行实现(legacy/111),手写版的定制空间=TTL/分段/权重

## 总结点

1. TreeMap 红黑树排序,支持范围查询
2. LinkedHashMap 链表保序,访问序可做 LRU
3. TreeMap 判重靠 compare,一致性要求高
