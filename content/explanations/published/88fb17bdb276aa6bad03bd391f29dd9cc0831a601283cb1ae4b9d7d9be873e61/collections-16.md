<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:缓存加载用 containsKey+put——并发首访时加载函数执行 2 次(缓存击穿单机版);putIfAbsent 原子只执行 1 次。用竞态窗口说明复合操作与原子 API 的差异(第 15 题的专论展开)。

1. 竞态窗口:containsKey=false(线程 A)→线程 B containsKey=false→A put(加载 v1)→B put(加载 v2,覆盖 v1)——两次加载+值不确定;窗口=两步之间的任意调度。
2. putIfAbsent 的原子性:一条指令完成"检查+放入"(桶级同步内)——N 线程并发同键,恰好一个执行加载,其余拿到首次结果——本机实验形态(分布式 15 题合并 200→1 的 JVM 内同构)。
3. extends:getOrDefault(读的默认值)、computeIfAbsent(加载)、merge(计数)——原子 API 族覆盖常见的复合模式;自定义复合逻辑用 synchronized(map) 包裹(锁粒度=全表,性能代价)或分桶锁。

## 参考分析

### 第二步扩展① 机制:两步与一步的调度对比

- 两步的调度序列:A.check(false)→B.check(false)→A.put(v1)→B.put(v2)——B 覆盖 A(v1 的加载白做,结果取决于调度)。
- 一步(putIfAbsent):原子地在桶锁内 check+put——B 的 putIfAbsent 发现已存在→直接返回已有值(v1)——B 不执行自己的加载。
- 竞态窗口的消除=把复合操作下沉到容器的同步域内。

### 第二步扩展② 反例:两步写的两次事故

- 事故一,缓存重复加载:并发首访同一 key——加载函数(查库 200ms)执行 2 次——数据库瞬时 2 倍压力(热点 key 更甚,第 15 题分布式击穿)。
- 事故二,初始化重复:配置对象的双初始化(两个线程各自构建配置 put)——后 put 覆盖,先 put 的引用已被其他线程持有(持有 v1 引用的线程继续用 v1——状态分叉)。
- 修复:putIfAbsent(加载一次+引用一致)。
- 配置类场景 computeIfAbsent。

### 第二步扩展③ 取舍:putIfAbsent 与 computeIfAbsent 的选择

- putIfAbsent:值已备好(或加载在函数外)——"键不存在才放"。
- 不感知"放之前的加载是否被跳过"(竞态下加载白做但不重复放——加载成本×并发数)。
- computeIfAbsent:加载在函数内——并发下函数只执行一次(加载成本最省)——缓存场景优选。
- 语义细节:putIfAbsent 返回"已存在的旧值"——在 CHM 中 null 只能是"本次放入"(CHM 禁 null 值,无歧义)。
- 在 HashMap 中 null 有歧义("无旧值"或"旧值就是 null",与第 18 题 null 问题同源)。
- computeIfAbsent 返回"最终值"(无论谁算的)——返回值语义决定调用方的后续逻辑。

## 案例

### 第三步发散·验证与推演 验证:原子 API 的对照断言

- 验证:并发加载断言(10 线程同键首访:containsKey+put 形态断言加载执行≥2 次。
- computeIfAbsent 断言恰好 1 次)。
- 覆盖断言(两步形态断言"先加载的值被覆盖"——值不确定)。
- 返回值断言(putIfAbsent 与 computeIfAbsent 的返回语义对照)——三组固化复合操作的原子性差异。

### 第三步发散·追问扩展 追问链:putIfAbsent 三刀

- **Q1：putIfAbsent 的 null 值?**
  - 答：CHM 不允许 null 值(第 18 题)——"不存在"与"值为 null"不可区分的问题在 CHM 不存在(HashMap 有此歧义);映射到 Optional 的思考。
- **Q2：先占位后完成?**
  - 答：长加载:putIfAbsent(key, future)→异步完成 future.complete(分布式 15 题 coalesce 同构)——占位对象让桶锁立即释放,加载异步化。
- **Q3：containsKey 的合法使用?**
  - 答：只读判断(不改状态)合法;作为写前检查(为 put 服务)即反模式——判据:后面有没有跟写。

## 总结点

1. containsKey 加 put,窗口必穿透
2. putIfAbsent 原子,computeIfAbsent 省加载
3. 长加载占位化,异步完成
