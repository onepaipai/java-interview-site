<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银计数沙盘:CHM 的 put/get 单键操作原子(桶级锁/CAS),但 containsKey+put 组合不原子——单键原子≠复合原子(第 2 题)——用 putIfAbsent/compute 说明原子 API 的正确用法(本机实验:CHM 88ms 的并发性能)。

1. CHM 的原子层级:单键 put/get/remove 原子(CAS 空桶/桶头 synchronized);复合操作必须用原子 API——putIfAbsent(不存在才放)、compute/computeIfAbsent(读改写原子)、merge(合并)——JDK 8+ 的函数式原子族。
2. 本机锚点:8 线程 40 万 ops CHM 91ms(synchronizedMap 233ms)——CHM 的并发优势建立在其原子 API 上;错误用法(containsKey+put)穿透原子性——两步之间的窗口(第 2 题 synchronizedMap 的复合坑同源)。
3. computeIfAbsent 的语义:键不存在时执行 mappingFunction 并放入(原子)——缓存加载的标准姿势(第 15 题分布式 singleflight 的 JVM 内形态);但要防"函数内重活"(第 17 题)与递归更新(同 map 内再改本 map 抛 IllegalStateException/死锁)。

## 参考分析

### 第二步扩展① 机制:桶级同步与原子 API 的实现

- put 的原子性:桶空=CAS 插入(casTabAt 直接对 Node 数组槽)。
- 桶非空=synchronized 锁住链头 Node 对象——锁的是"桶里第一个节点"而非数组槽本身,读路径全程无锁(volatile 读)。
- 演进:JDK 7 用 Segment 分段锁(默认 16 段,并发度=段数,每段一把锁)。
- JDK 8 取消 Segment 改 CAS+synchronized,并发度=桶数——粒度更细且省掉段结构。
- 扩容期间 ForwardingNode 标记已迁移的桶,遇到它的写线程 helpTransfer 协助搬移——扩容与读写并行推进。
- computeIfAbsent:桶头 synchronized 内执行 mappingFunction——同一桶的其他写被阻塞(函数时长决定桶的阻塞时长,第 17 题)。
- size/isEmpty:弱一致(CounterCell 分散计数,第 19 题)——单键原子与全局统计是两个层级。

### 第二步扩展② 反例:复合操作的两种穿透

- 穿透一,check-then-act:if (!map.containsKey(k)) map.put(k, load(k))——并发下 load 执行两次(缓存击穿单机版,第 15 题分布式)——computeIfAbsent 原子化。
- 穿透二,读改写:map.put(k, map.get(k)+1)——并发丢更新(计数少加,分布式 7 题同构)——merge(k, 1, Integer::sum) 或 compute。
- 两条的通用修复:凡"读改写"或"查后放"必用原子 API——CHM 的函数式族就是为此设计。

### 第二步扩展③ 取舍:computeIfAbsent 的适用与禁忌

- 适用:缓存加载(计算开销适中、幂等)、计数初始化。
- 禁忌:函数内长时间 IO(RPC——桶锁被占,同桶操作全部排队,第 17 题)、函数内递归修改同 map(未定义行为/死锁)、函数返回 null(不放 entry,语义要懂)。
- 长任务的替代:先 putIfAbsent(占位 future)再异步完成(分布式 15 题的合并形态)——占位+完成的模式规避桶锁阻塞。

## 案例

### 第三步发散·验证与推演 验证:原子 API 的断言组

- 验证:并发 putIfAbsent 断言(N 线程同键并发,断言 mappingFunction 只执行一次)。
- merge 计数断言(并发 merge 计数精确,零丢失——对照 map.put(k, get+1) 的丢失)。
- computeIfAbsent 阻塞断言(慢函数期间同桶其他键操作延迟——桶锁粒度的可观测)——三组固化原子语义(本机 C2 的吞吐对照为性能锚点)。

### 第三步发散·追问扩展 追问链:原子 API 三刀

- **Q1：compute 与 merge 的区别?**
  - 答：compute 总是执行函数(存在与否都调,返回 null 删除);merge 仅在存在时 merge(不存在直接放初值)——语义细节决定选型。
- **Q2：多键复合操作?**
  - 答：CHM 无跨键事务:两个键的联动改(转账 A 减 B 加)CHM 保证不了(第 2 题banking)——跨键一致性需要外部协调(锁/事务,资金场景回 DB)。
- **Q3：弱一致的遍历?**
  - 答：迭代器弱一致(不抛 CME,反映创建时或之后的部分更新,第 2 题)——遍历统计的业务语义要容忍弱一致(精确统计用外部原子结构,第 19 题)。

## 总结点

1. 单键原子,复合必须用原子 API
2. computeIfAbsent 管缓存,禁长任务
3. 跨键一致性 CHM 给不了
