<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：MaxTenuringThreshold 设成 15 却发现对象几次 Minor GC 就进了老年代。用动态年龄判定解释"阈值不是硬门槛"，并分析过早晋升与过晚晋升各自的代价。

1. 晋升不只看年龄：动态年龄判定规则下，若某年龄及以下的对象总大小超过 Survivor 空间的一半（目标存活率），这一批整体提前晋升——阈值 15 只是上限不是承诺。
2. 过早晋升的代价：短期对象占老年代，Minor GC 帮不上忙，老年代回收频率与并发周期被拉高；多数源于 Survivor 太小或分配速率过高。
3. 过晚晋升的代价：长期对象反复在 Survivor 间复制，复制成本浪费；Survivor 溢出还会触发担保失败直接进老年代。合适状态是"到龄即走、批不过半"。

## 参考分析

### 第二步扩展① 机制：Survivor 是按"半数表决"的晋升机制

- Survivor 空间有限，GC 按年龄从小到大累计对象大小，累计到超过一半就"整届毕业"——类比班级保送：名额按年级累计计算，某一年级人数超过一半就整年级保送，校规上的"最高读 15 年"只是兜底。
- 这个设计保证 Survivor 始终有足够空间容纳最年轻一代。

### 第二步扩展② 反例：调大 MaxTenuringThreshold 的误用

- 看到对象过早晋升就把阈值从 1 调到 15，结果 Survivor 挤爆、担保失败，更多对象反而直接进老年代。
- 根因是 Survivor 容量与分配速率不匹配：正确动作是扩大 Survivor（调整 NewRatio 或 G1 的 region 配比）、降低分配速率，或接受大对象直接进老年代的现状（见第 45 题）。

### 第二步扩展③ 取舍：G1 下参数语义的变化

- G1 的 Survivor 与晋升由 region 集合动态决定，MaxTenuringThreshold 仍生效但"半数表决"按目标空间计算。
- 大对象（humongous）不经过年龄机制直接分配老年代连续 region。
- 讨论晋升时先问"哪个回收器"，参数含义不能跨回收器照搬（见第 14 题）。

## 案例

### 第三步发散·验证与推演 对照操作：动态晋升的日志证据

- 教学验证：小 Survivor + 高分配负载下 -Xlog:gc* 观察对象年龄分布（G1 的 age table 输出）。
- 预期：日志显示"max age threshold 调整为 N"且 N 远小于 15，晋升发生在 N 岁。
- 对照大 Survivor 配置，阈值恢复、晋升延后。
- 实验可复跑，把"半数表决"变成可见日志。

### 第三步发散·追问① 追问：为什么需要动态年龄而不是死阈值

- 死阈值在分配速率波动时会造成 Survivor 溢出（到龄不走的对象挤不进来），担保失败反而制造更多直接晋升。
- 动态年龄按"当前空间能养活几代"自适应，本质是把稀缺空间优先分给最年轻一代——与分代假设的资源分配逻辑一致。

## 总结点

1. 阈值是上限，半数是判据
2. 过早晋升养肥老年代
3. 先修容量，再调阈值
