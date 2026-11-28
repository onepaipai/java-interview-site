<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ExecutorService.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：服务发布需要停止一个图片转码线程池：任务正在处理的临时文件必须落盘完整。对照 shutdown（等队列排空）与 shutdownNow（中断并取回未执行任务）两种关闭流程，设计带超时的两段式停止。

1. shutdown 语义是"不再接新活，已接的做完"：温和但可能等很久，配合 awaitTermination 超时才能避免无限期等待。
2. shutdownNow 语义是"停止接活并尝试打断现役"：返回未执行任务列表，但正在执行的任务能否停下取决于它是否响应中断。
3. 工程上通常两段式：先 shutdown 加有限等待，超时再 shutdownNow，最后仍要 awaitTermination 确认并做资源兜底清理。

## 参考分析

### 第二步扩展① 机制：两种关闭都只是"状态机切换"

- shutdown 把池状态切到 SHUTDOWN：队列里的任务仍会被执行，只是拒绝新提交。
- shutdownNow 切到 STOP：中断所有工作线程并倒出队列。
- 类比餐厅打烊两种方式：温和版是"已下单的菜做完就关门"，强制版是"炉子全关，没下锅的菜退单"。
- 温和版的收尾时间取决于最长任务，强制版的实际停止率取决于任务对中断的响应。

### 第二步扩展② 故障推演：转码任务的中断盲区

- 转码核心是一段调用本地库的循环，不检查中断也不抛可中断异常：shutdownNow 的中断只置了标志，任务继续跑满 30 秒。
- 若关闭代码 awaitTermination 只等 5 秒就继续进程退出，临时文件损坏、本地库状态残留。
- 修复要么让循环分段并在段间检查 isInterrupted（顺带删除半成品文件），要么接受该任务不可中断，把超时加长到覆盖最长任务。

### 第二步扩展③ 取舍：超时值与"半成品"策略一起定

- 两段式的第一段超时应覆盖正常队列排空时间（可由监控里最老任务年龄估计），第二段后必须处理返回的未执行任务列表（持久化待重放或明确丢弃并告知调用方）。
- 中断不响应的任务是shutdownNow失效的主因，评审时应把"长任务是否有中断检查点"当作关闭方案的组成部分。

## 案例

### 第三步发散·验证与推演 对照操作：两段式关闭的完整时序

- 教学验证：池 2 线程、队列 8 个 200 毫秒任务。
- shutdown 后 awaitTermination(1s)：预期 1 秒内排空、返回 true、isTerminated 为 true。
- 构造慢任务版本（每个 2 秒、共 10 个）：第一段超时后 shutdownNow，预期返回 8 个左右未执行任务，运行中任务在下一个检查点退出。
- finally 中统一删除临时文件。
- 代码可复跑，时序数字会有浮动。

### 第三步发散·追问① 追问：JVM 退出钩子里能安全关池吗

- 可以但有限制：addShutdownHook 中调用 shutdown 加 awaitTermination 是标准做法，钩子时长有限且不接受新工作。
- 如果任务本身不退出（死循环无检查点），钩子会卡住，进程被操作系统强杀，兜底清理不会执行。
- 所以钩子内的等待必须有超时，且业务任务必须保证可收敛。

## 总结点

1. 先温和后强制，两段都带超时
2. 退单清单要处理，半成品要清场
3. 任务不响应中断，强关也是空转
