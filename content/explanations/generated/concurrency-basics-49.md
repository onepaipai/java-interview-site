<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：任务工具类统一 catch InterruptedException 后调用 Thread.interrupted() 判断来源，导致后续检查点永远读不到标志。对照 interrupted（静态、读并清除）与 isInterrupted（实例、只读）语义，梳理检查点设计。

1. static Thread.interrupted() 读取并清除当前线程的标志，instance isInterrupted() 只读取不清除；一字之差，语义完全不同。
2. 常见错误三种：在库代码里调用静态方法（清掉调用者的标志）；把 isInterrupted 当清除用导致循环立即重复中断处理；catch 后既不恢复也不检查，标志丢失。
3. 检查点设计原则：长循环与阻塞之间设检查点；检查即响应（退出或恢复）；工具类不要碰清除语义，除非它本身就是中断的处理终点。

## 参考分析

### 第二步扩展① 机制：清除是一次性签收

- interrupt 把标志置位。
- 静态 interrupted() 的契约是"读取并复位"，表示"我已签收并处理"。
- 类比已读回执：点一次回执（interrupted），信箱清空。
- 只看信封（isInterrupted），信还在。
- 库代码点掉回执等于替调用方签收了取消请求，而它自己又不打算响应——信号从此消失，上层再也停不下这个任务。

### 第二步扩展② 反例：三处典型的错用

- 错误一：通用工具类 catch (InterruptedException e) { if (Thread.interrupted()) ... }，把上层的中断信息就地清除。
- 错误二：while (!Thread.currentThread().isInterrupted() && !done) 循环里某分支调用静态 interrupted() 做"顺手判断"，标志被清，循环不再响应后续中断。
- 错误三：怀疑标志"没设置上"，反复 isInterrupted 调试，实际是标志早已被某处静态调用清空。
- 共同根因：把"读取"和"签收"当成同一件事。

### 第二步扩展③ 取舍：谁有权清除标志

- 清除权属于"决定如何响应中断"的层：通常是任务本身（catch 后选择退出）或线程的最外层包装（最终响应）。
- 中间层（工具方法、装饰器）只传播：要么 re-throw，要么 currentThread().interrupt() 恢复。
- 检查点的职责是"发现并快速响应"，不是"诊断"——生产代码里对 isInterrupted 的使用应当极少，多数响应路径是阻塞方法抛异常。

## 案例

### 第三步发散·验证与推演 对照操作：两种读取的差异实验

- 教学验证：线程内先 interrupt 自身，依次打印 Thread.interrupted()（true，随后标志清空）与再打 interrupted()（false）。
- 另一线程对照 isInterrupted() 两次都为 true。
- 再构造两层调用：内层工具误用静态方法，外层循环检查点失效，任务无法被停止。
- 把内层改为恢复标志后恢复可停。
- 代码可复跑，语义与 Thread 的 Javadoc 一致。

### 第三步发散·追问① 追问：为什么阻塞方法抛异常时标志是空的

- 这是语言约定：抛出 InterruptedException 即表示"信号已通过异常送达"，标志同时复位，防止同一中断被异常路径与标志路径重复响应。
- 代价是 catch 方必须显式选择去向（结束或恢复标志）——这正是第 10 题"不应吞掉中断"的机制根源，两题合看构成中断处理的完整闭环。

## 总结点

1. interrupted 签收即清空，isInterrupted 只看不清
2. 清除权只在响应层
3. 检查点管发现，响应层管去向
