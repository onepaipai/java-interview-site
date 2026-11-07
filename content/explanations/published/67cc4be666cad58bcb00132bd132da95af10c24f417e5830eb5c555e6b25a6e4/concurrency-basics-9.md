<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：下载线程分块读取远端文件，UI 线程在其长时间阻塞的读取期间调用 interrupt。推演阻塞方法抛出异常、普通循环代码只置标志两种响应路径，说明取消为什么不能被强制执行。

1. interrupt 不直接终止线程：它设置中断标志，并让处于可中断阻塞中的方法（sleep、wait、可中断 IO）立即抛出 InterruptedException。
2. 被中断的一方决定如何响应：清理后返回、降低优先级继续、或忽略——语言层不提供"杀死线程"的安全手段。
3. 响应中断是义务而非礼貌：吞掉标志会让取消失效，任务永远跑不完，线程池的 shutdownNow 也因此无法收敛。

## 参考分析

### 机制：一个标志加一类唤醒，其余交给业务

中断类比会议室的门铃：按铃（interrupt）只是通知，离开与否、带走什么文件（清理）由里面的人决定。阻塞方法相当于屋里的人睡着了，门铃可以直接把他叫醒，但叫醒的方式是抛出 InterruptedException，把"你被要求停止"编码成异常传播。Thread.interrupted 与 isInterrupted 的区别是前者读取并清除标志，清除动作本身就体现了"信号已被接收"的约定。

### 边界：不可中断的阻塞与原子代码

synchronized 等锁、对象构造、传统 socket 读（非 NIO）不响应中断：标志被置上，但线程仍卡在原处，只有等阻塞返回后才检查。这类场景要换可中断等价物：lockInterruptibly、NIO 的 InterruptibleChannel，或对底层连接加超时。这解释了"中断了却停不下来"的常见现象——不是中断失效，而是那段代码本就不在可中断点上。

### 取舍：为什么 Java 不提供强制终止

强制终止无法保证一致性：线程可能正持有锁、正修改共享结构，杀在半路会留下损坏状态。Thread.stop 早已废弃。协作取消把清理责任交给最了解自己状态的代码：文件句柄、临时文件、事务回滚都由被中断方处理。代价是"取消是否生效"取决于代码质量，所以取消标志要作为接口契约来审查。

## 案例

### 对照操作：阻塞读与计算循环两种响应

教学验证：任务一 sleep 循环并检查 isInterrupted，任务二直接 sleep(60000)。外部 interrupt 后预期任务一在下一轮退出并记录"已取消"，任务二立即抛 InterruptedException；两个任务都在 catch 或 finally 里关闭文件句柄。再演示反面：catch 后什么都不做，任务二的下一次 sleep 不再抛异常——标志已被清除且未恢复。

### 追问：取消标志可以代替 interrupt 吗

自定义 volatile 标志适合纯计算循环，但无法唤醒阻塞：线程睡在队列 take 上时，改标志毫无作用，还必须再发 interrupt。标准做法是两者并用：标志供快速路径检查，interrupt 负责唤醒阻塞；ExecutorService.shutdownNow 与 Future.cancel(true) 都是这个组合。

## 总结点

1. 中断是门铃，不是强拆
2. 阻塞点靠异常醒，循环里查标志
3. 吞标志等于撕掉取消单
