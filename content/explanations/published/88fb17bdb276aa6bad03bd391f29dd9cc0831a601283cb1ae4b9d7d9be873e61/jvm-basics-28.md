<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：长周期服务运行数日后吞吐阶梯式下降，重启恢复。用 CodeCache 的分段结构与编译停摆机制解释"越跑越慢"，给出容量规划与清理策略。

1. CodeCache 存 JIT 编译产物，分三段：非方法代码、含 profile 的 C1 代码、C2 优化代码（ReservedCodeCacheSize 总控，默认分层编译约 240MB）。
2. 缓存满时编译停摆：新方法不再编译、失效方法无法重新编译，热点回退解释执行或停留在低层版本，吞吐阶梯下降且不恢复——直到重启。
3. 触发源：巨量动态生成类/方法（脚本引擎、代理框架）撑爆缓存；碎片化让"总量未满也放不下"；清理 Sweeper 只回收失效方法，救不了活跃编译产物的膨胀。

## 参考分析

### 第二步扩展① 机制：编译产物也是要管家的内存

- 编译出的机器码放在专用代码区，JIT 的每一次优化成果都占一格。
- 类比厨房菜谱卡：容量有限，来一道新菜写一张卡。
- 卡槽用完，新菜只能靠师傅口头背（解释执行），老菜谱作废了也补不回去。
- 吞吐下降不来自"算得慢"，而来自"好菜谱没了"。

### 第二步扩展② 反例：脚本引擎的慢性消耗

- Groovy/JS 引擎每执行一段动态脚本就生成新类与新方法，数月积累百万级方法体。
- 特征：JFR/JMX 的 CodeCache 满载率爬升、`CodeCache is full` 告警、fullNativeMemorySegment 警告后吞吐掉档。
- 对策：升级脚本引擎复用编译产物、限制动态类生成、调大 ReservedCodeCacheSize 只解燃眉。

### 第二步扩展③ 取舍：容量与回收参数怎么配

- 分层编译默认 240MB 对多数服务充裕。
- 大量动态生成的服务按"编译产物字节估算 × 安全系数"设定，并监控 code-cache 满载率告警（比如 80%）。
- `-XX:+UseCodeCacheFlushing` 允许回收长期未调用的热点版本（有再编译成本）。
- 真正可持续的方案是控制动态生成速率。

## 案例

### 第三步发散·验证与推演 对照操作：模拟缓存耗尽

- 教学验证：以极小 `-XX:ReservedCodeCacheSize=8m` 运行持续热点负载。
- 预期：日志出现 CodeCache is full，后续编译停止，吞吐相比正常配置明显下降，JFR/JMX 的 codeCache 满载率 100%。
- 恢复大缓存后吞吐回归。
- 实验可复跑，把"越跑越慢"的机制钉死。

### 第三步发散·追问① 追问：CodeCache 与 Metaspace 为什么分开放

- 元空间存类元数据（解释执行也需要的结构），CodeCache 存编译后的机器码（JIT 才产生）。
- 生命周期与回收机制不同：类卸载随加载器，代码随方法失效被 Sweeper 清理。
- 混在一处会让"类泄漏"与"代码膨胀"互相污染排查结论，分而治之是排查框架的一部分（见第 37 题）。

## 总结点

1. 菜谱卡满，好菜不产
2. 满载率 80% 告警
3. 治本靠少造类，不是调大缓存
