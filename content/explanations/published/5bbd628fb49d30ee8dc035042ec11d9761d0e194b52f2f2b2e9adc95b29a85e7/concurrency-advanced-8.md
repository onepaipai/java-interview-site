<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/AtomicLong.html.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：网关计数既要每秒百万级累加吞吐，又要在部分路径上做"达到阈值立即拒绝"的精确判断。梳理 LongAdder、AtomicLong、分片与定期聚合的组合策略，并明确每种方案的语义代价。

1. 纯吞吐路径（指标累加）用 LongAdder：分片累加几乎线性扩展，代价是 sum() 是瞬时近似值，不能作为决策依据。
2. 决策路径（限流、阈值判断）用 AtomicLong 的 CAS 或 compareAndSet：每次读改写精确原子，代价是所有线程挤同一缓存行。
3. 组合方案：Adder 负责高速累加，按窗口把分片值精确汇入一个 AtomicLong 权威值，决策只读权威值；窗口内的轻微滞后必须被业务接受，不接受就全程 AtomicLong 并接受吞吐上限。

## 参考分析

### 机制：把"数得快"与"判得准"拆成两条账

LongAdder 是流水账（各分片记各的），AtomicLong 是总账（一笔不差但大家排队）。类比超市：收银小票流水（Adder）随时打，日结对账（聚合进 AtomicLong）每天一次；促销库存判断必须查总账，不能拿流水估。两条账的差值 = 窗口内的统计滞后。

### 反例：拿 sum() 做限流的误差放大

限流逻辑 if (adder.sum() >= limit) reject：并发写入时 sum 漏记分片变化，放行量可能超出阈值数个百分点；阈值越紧、写入越密，误差越大（并发基础第 15 题的进阶版推演）。修复路径只有一条：决策读精确值，即 AtomicLong 的 CAS 更新。

### 取舍：窗口聚合的滞后边界

聚合周期 T 内，权威值最多落后 T + 一次聚合耗时的量。对"每秒配额"类业务，T=100–200 毫秒的滞后通常可接受（允许 1% 超放）；对"精确扣减"（库存、余额）零容忍，必须全程 CAS 或下沉数据库原子更新。滞后是否可接受是业务决策，不是技术参数。

## 案例

### 对照操作：三条路径的吞吐与误差对照

教学验证：64 线程累加 1 亿次，分别用 AtomicLong、LongAdder、Adder+100 毫秒聚合窗口。预期：吞吐 Adder 最高、AtomicLong 最低；限流判定实验中 Adder 直读组出现超发、聚合组误差收敛在窗口内、AtomicLong 组零误差。实验可复跑，数字即选型依据。

### 追问：能不能给 LongAdder 补一个精确读

没有廉价办法：精确读需要把所有分片的写合并到一点，等于放弃分片。Javadoc 对 sum() 的"非原子快照"定义就是边界声明——需要精确就换数据结构，而不是给近似结构打补丁。这也是"读数语义先于工具选择"的标准案例。

## 总结点

1. Adder 数得快，Atomic 判得准
2. 流水账不能当总账用
3. 窗口聚合，滞后要业务点头
