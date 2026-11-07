<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：库存服务使用 ConcurrentHashMap<String,Integer> 存库存，业务做"读取、判断、扣减"三步。推演逐操作线程安全但业务竞态的丢扣减路径，给出 merge/compute 与外部锁两种修复。

1. 线程安全类的承诺止步于"单个操作原子"：get 与 put 之间的窗口属于业务代码，两个请求可以同时读到同一库存并各自通过判断。
2. 业务操作是否安全取决于"不变式"由谁维护：跨多个操作的规则要么用容器的复合原子方法（compute、merge），要么用锁把整个业务动作包住。
3. 反过来说，把整个大对象塞进 ConcurrentHashMap 也换不来业务原子性：容器保证的是结构不被破坏，不是业务规则不被穿透。

## 参考分析

### 机制：安全零件不等于安全机器

ConcurrentHashMap 保证"一次 put/get 不会被撕裂"，类比每个齿轮都合格；但"读库存、判断、写库存"是三个齿轮之间的传动，装配（业务代码）没有原子性。两个线程同时 get 到 1、各自判断可扣、各自 put 0——两笔订单扣一份库存。这就是"逐操作安全、组合不安全"的标准画像。

### 反例：三种"以为安全"的写法

写法一：先 get 判断再 put——竞态窗口在两步之间。写法二：synchronized(list) 包业务但 list 实际由并发容器管理——锁对象与容器内部机制无关，白锁（锁错对象不产生互斥于容器，但至少业务间互斥；更糟的是以为容器因此安全而忽略别的入口）。写法三：size()+1 后 put——size 与 put 之间同样有窗口。共同点：不变式的维护点没有原子化。

### 取舍：复合原子方法与锁的边界

单 key 上的读改写用 compute(key, (k, v) -> ...)：容器在持有该桶段锁的状态下执行函数，天然原子；merge 适合累加语义。函数内部不要做 IO、不要长计算——会拖住同桶段的其他操作。跨 key 的一致性（转账两账户）compute 覆盖不了，需要外部锁按固定顺序（见第 32 题）或把该不变式下沉到数据库事务。

## 案例

### 对照操作：丢扣减的复现与两种修复

教学验证：库存 1，100 线程并发"判断后扣减"。get-put 版本预期成功扣减次数大于 1（超卖）；compute 版本在函数内判断并返回 null（移除）或新值，成功扣减恒 1 次；外部锁版本同样恒 1 但吞吐低于 compute。记录三种实现的正确性与耗时。实验可复跑，是"组合操作"语义的标准演示。

### 追问：为什么说"换成数据库扣减"是另一个维度

进程内容器的原子性只在单 JVM 有效，多实例部署下每个实例各扣各的，业务超卖依旧。真正的库存不变式要么放数据库（条件更新 UPDATE ... SET stock=stock-1 WHERE stock>=0），要么上分布式协调。ConcurrentHashMap 的 compute 解决的是"本进程内的并发正确性"，不要把它当分布式方案。

## 总结点

1. 零件合格，装配仍会错
2. 不变式在哪，原子边界就在哪
3. 单 key 用 compute，跨 key 用锁或下沉
