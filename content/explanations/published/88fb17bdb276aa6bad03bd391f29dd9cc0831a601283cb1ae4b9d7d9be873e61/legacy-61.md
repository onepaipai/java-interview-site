<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:HashMap 扩容(容量×2+rehash 迁移)+树化(链长≥8 且桶≥64)+JDK7 头插法并发死循环——collections 61 题的完整版(容量规划/树化/并发安全详见 collections 模块)。

1. 扩容过程:put 时 size>容量×负载因子(默认 0.75)→resize(容量×2)→JDK 8 按 (hash & oldCap) 位拆高低链表(单桶 O(1) 迁移,不是全部重 hash)——扩容代价=全表迁移(尾延迟抖动)。
2. 树化条件:链长≥8(TREEIFY_THRESHOLD)且桶数≥64(MIN_TREEIFY_CAPACITY)——桶数<64 时优先扩容(稀释)而非树化(第 4 题 collections);退化:节点≤6(扩容拆分)或 remove 导致树过小(removeTreeNode)。
3. JDK 7 头插法死循环:并发扩容时头插法导致链表成环(e→next→e)→get 自旋 100% CPU;JDK 8 改尾插(新节点追加到尾部)消除环——但 JDK 8 并发 put 仍有数据丢失(只是不死循环,第 2 题 collections)。

## 参考分析

### 第二步扩展① 机制:扩容的 rehash 迁移

- JDK 8 的 rehash 优化:每个节点的新位置要么是原位置,要么是原位置+oldCap(hash & oldCap 决定高低位)——拆分后只需链表操作,不用重新计算 hash。
- JDK 7 需要对每个节点重新 hash(性能差+头插法反转链表顺序)。

### 第二步扩展② 反例:HashMap 的三种事故

- 事故一:并发 put 数据丢失——JDK 8 并发 put 同桶→互相覆盖(无锁)。
- 修复=ConcurrentHashMap。
- 事故二:初始容量不足——频繁扩容(每次全表迁移)。
- 修复=按"元素数/0.75 取 2 的幂"预分配(第 1 题 collections 容量规划)。
- 事故三:自定义键的 hashCode 不一致——equals 相等但 hashCode 不同→哈希容器中"丢失"。
- 修复=hashCode 与 equals 一致(第 2 题 collections 契约)。

### 第二步扩展③ 取舍:HashMap vs ConcurrentHashMap 的选型

- HashMap:单线程/方法内局部变量/只读共享(不可变包装)。
- ConcurrentHashMap:多线程读写共享。
- Collections.synchronizedMap:低并发+兼容旧 API(第 2 题 collections 的选型)——判据一句话:并发读写选 CHM,只读选不可变包装,别让 HashMap 出现在共享可变位置。

## 案例

### 第三步发散·验证与推演 验证:HashMap 行为的走查核对

- 验证:本机 C 系列实验——容量规划(C1:1000→1024 桶,768 触发扩容)。
- 树化(C4:16 桶 30 键→64 桶才树化。
- 128 桶 12 键直接树化)。
- 并发丢失(C2:HashMap 并发 put size<预期)。
- JDK7 死循环(标注:JDK 7 环境复现,17 上不存在)。
- 验证:扩容/树化/并发的断言可程序化(--add-opens 反射读 table)。

### 第三步发散·追问扩展 追问链:HashMap 三刀

- **Q1：负载因子为什么是 0.75?**
  - 答：空间与时间的折中:负载因子高(0.9)→空间省但冲突多查询慢;低(0.5)→冲突少但内存浪费——0.75 是泊松分布的经验值(链长>8 的概率极低,第 4 题)。
- **Q2：树的退化条件?**
  - 答：扩容拆分≤6(UNTREEIFY_THRESHOLD)+remove 导致树过小(removeTreeNode 内检查)——两条退化路径(第 4 题 collections 详解)。
- **Q3：HashMap 的 null key?**
  - 答：允许一个 null key(hash=0,存在桶 0)——CHM 不允许 null key/value(第 18 题 collections)。

## 总结点

1. 扩容×2,高低位拆分 O(1) 迁移
2. 树化=链 8+桶 64 双条件
3. JDK7 死循环已修,并发仍不安全
