<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银过滤沙盘:stream.filter(x -> { audit(x); return valid(x); })——惰性求值下 audit 的执行时机与次数不可预期(终端操作才触发/短路可能跳过/并行流乱序)——Stream 的 lambda 应纯,副作用显式挪出。

1. 惰性的语义:中间操作(filter/map)只记录不执行——终端操作(collect/forEach/count)才触发——lambda 的执行时机=终端操作时刻(不是代码书写位置)。
2. 副作用的三类问题:时机不可预期(调试/审计的时机错位)、次数不可预期(短路操作[findFirst]跳过元素——审计漏记)、顺序不可预期(并行流乱序——审计顺序错,第 15 题分布式)。
3. 正解:Stream 的 lambda 纯(只转换/判断,不改状态);副作用显式挪出(先 collect 再 forEach 审计/用 peek 调试仅限[debug 语义])——Stream 管道的数据流与副作用的分离。

## 参考分析

### 第二步扩展① 机制:惰性求值与短路

- 惰性:filter(x -> expensive(x)) 在 count() 时才执行(且 count 优化可跳过 filter[JDK 9 的 count 优化:已知 size 的流直接返回])——lambda 执行次数与元素数的关系不透明。
- 短路:findFirst/findAny/limit——短路后的元素不经过中间操作(副作用 lambda 跳过)。
- 并行:parallel stream 的 lambda 并发执行——共享可变状态的副作用竞态(第 20 题)——并行流的 lambda 必须无状态。

### 第二步扩展② 反例:副作用 Stream 的三种事故

- 事故一,审计漏记:filter(lambda 内审计)——短路/优化跳过部分元素——审计不完整(合规风险,第 32 题)。
- 事故二,调试失效:peek 调试(peek 在短路下同样跳过——调试输出误导)。
- 事故三,状态污染:map(lambda 内改外部 Map)——并行流竞态(丢失更新)——统计错误。
- 三条的正解:审计/调试/状态修改全部挪出 Stream(collect 后处理)或用 Collector 内聚(toMap 的 merge)。

### 第二步扩展③ 取舍:Stream 可读性与副作用的平衡

- Stream 的价值:声明式数据转换(过滤映射归并的可读性)。
- 副作用是它的禁区(函数式纪律)。
- 副作用需求的替代:循环(命令式,副作用自由)——"Stream 管转换,循环管副作用"的代码分工(混合:先 Stream 转换 collect,再循环处理副作用)。
- 团队的 Stream 纪律:lambda 纯度检查(评审:lambda 内禁止赋值/IO)——纪律进评审清单(第 24 题)。

## 案例

### 第三步发散·验证与推演 验证:副作用问题的断言组

- 验证:时机断言(惰性求值:无终端操作时 lambda 零执行——时机实证)。
- 短路断言(limit(1) 下 filter 的 lambda 只执行到首个匹配——次数实证)。
- 并行竞态断言(parallel 流内改共享 Map,断言丢失更新——竞态复现)——三组固化副作用问题。
- 纯 lambda 的 lint 规则进 CI(抽查)。

### 第三步发散·追问扩展 追问链:Stream 三刀

- **Q1：peek 的定位?**
  - 答：peek=调试用途(JDK 文档明确:调试用)——生产代码的 peek(副作用)反模式;peek 的合理残留=日志开关内的 debug(第 32 题)。
- **Q2：Collectors 的原子性?**
  - 答：toMap 的 merge(第 17 题)与 groupingBy 的并发版(concurrent)——Collector 内的副作用是受控的(框架协调)——副作用"收口到 Collector"是 Stream 的合法副作用形态。
- **Q3：Stream 与异常?**
  - 答：lambda 不能抛受检(包装运行时,第 11 题)——Stream 与受检异常的摩擦(包装函数/Exit 文本)——异常与流的边界。

## 总结点

1. 惰性求值,时机次数顺序都不可预期
2. lambda 纯,副作用挪出管道
3. peek 只调试,副作用进 Collector
