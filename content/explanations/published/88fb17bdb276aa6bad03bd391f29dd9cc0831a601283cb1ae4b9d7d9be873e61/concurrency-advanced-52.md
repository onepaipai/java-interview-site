<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [OpenJDK 设计说明 · 1](https://openjdk.org/jeps/491)
- [OpenJDK 设计说明 · 2](https://openjdk.org/jeps/444)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银压测沙盘:JDK 21 上大量虚拟线程在 synchronized 块内阻塞，JFR 出现 VirtualThreadPinned 事件；团队准备升级到 JDK 24，需要判断哪些固定问题被解决、哪些仍需验证。

1. 虚拟线程阻塞时通常从载体线程卸载，让载体去跑别的任务；pinning 指某些路径无法卸载，阻塞会占住载体线程，削弱虚拟线程的扩展性。
2. JDK 21 中在 synchronized 块内阻塞会固定载体；JEP 491 在 JDK 24 改变了 synchronized 监视器的实现，使这类阻塞不再固定载体。
3. native method 与 foreign function 等路径仍可能固定载体，且具体行为以目标 JDK 文档和 JFR 事件为准；不能把"JDK 24 修了 pinning"说成所有固定场景都消失。

## 参考分析

### 第二步扩展① 机制:卸载与固定是两件事

- 虚拟线程把任务提交给少量载体线程。
- 遇到可卸载的阻塞点时，运行时把虚拟线程移走，载体继续执行其他任务。
- pinning 是"该卸载却不能卸载":虚拟线程被钉在载体上，载体数量有限，大量被钉住的虚拟线程会把载体耗尽。
- 类比出租车站:乘客下车办事可先把车让给下一位（卸载）。
- 若乘客把车门反锁坐在车里等（固定），车就被占住。
- JEP 491 改的是 synchronized 这把"反锁"的实现。

### 第二步扩展② 边界:JEP 491 没覆盖什么

- JEP 491 的交付版本是 JDK 24，针对 synchronized 监视器中阻塞导致的固定。
- native method、foreign function 以及个别早期版本内部路径仍可能固定载体。
- 诊断不能靠猜:在目标 JDK 用 JFR 订阅 jdk.VirtualThreadPinned，观察事件频率与调用栈，再决定是否改造同步块或升级。

### 第二步扩展③ 取舍:改造同步还是升级运行时

- 如果热点路径长期在 synchronized 内做阻塞 I/O，优先缩短同步块或用合适的并发结构。
- 升级到 JDK 24 可以降低这类固定，但升级本身要跑回归和灰度。
- 回答时给出版本、事件证据和改造动作，不要只背"虚拟线程不会被固定"或"synchronized 一定不能用"。

## 案例

### 第三步发散·验证与推演 验证:JFR 对照的实验设计

- 教学验证:在目标 JDK 起一组虚拟线程，在 synchronized 块内执行短阻塞，录制 JFR 并统计 VirtualThreadPinned。
- 把阻塞移出同步块后再录一次，预期事件显著减少。
- JDK 21 与 JDK 24 各跑一轮，验证 JEP 491 的版本差异。
- 这是实验设计，不代表本项目已在 21/24 双版本实跑。

### 第三步发散·追问① 追问:如何向面试官证明你懂边界

- 先说机制（阻塞能否从载体卸载），再说版本（21、24、JEP 491），最后说证据（JFR 事件与调用栈）。
- 再补一句"native/foreign 路径仍需验证"，就能把"背结论"和"会排查"区分开。

## 总结点

1. 能卸载才扩展，钉住就占载体
2. JDK 24 修同步，native 仍未清零
3. JFR 看事件，不靠猜
