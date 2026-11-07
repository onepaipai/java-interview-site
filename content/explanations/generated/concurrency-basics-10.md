<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ExecutorService.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：线程池中的导入任务在循环里分批处理数据，每批之间 sleep。对比 catch 后仅记日志、恢复中断标志、向上传播三种写法，在 shutdownNow 场景下观察任务收敛差异。

1. 捕获 InterruptedException 后不恢复标志也不传播，等于把取消信号吃掉：上层再也无法通过中断让任务停止。
2. 正确响应只有两类：本层能结束就直接结束（清理后返回或抛出），本层不能结束就 Thread.currentThread().interrupt() 恢复标志再继续。
3. 吞中断的代价在关闭路径集中爆发：shutdownNow 依赖中断，吞掉后线程池"关闭完成"的判定永远等不到。

## 参考分析

### 机制：异常即信号，catch 即签收

阻塞方法抛 InterruptedException 时，中断标志已被清除——语言用"抛异常"表示信号送达。catch 后既不处理也不恢复，就像签收了快递却把它扔进垃圾桶：寄件方（发起取消的代码）以为已送达，收件方（任务）却毫无动作。恢复标志相当于把信重新贴好转交上级，让调用链上更有资格决策的代码来响应。

### 故障推演：批量任务为何关不掉

导入任务每批 sleep(500)，catch 后只记日志。管理员调用 shutdownNow 停止服务，运行中的批间 sleep 被中断一次，任务记录"中断"后继续循环，后续 sleep 不再抛异常（标志未恢复、也未检查）。结果：池已标记关闭，任务却跑完全部批次，部署脚本等待超时。修复只需 catch 中恢复标志，循环条件增加退出检查，或在 catch 中直接 return。

### 取舍：什么情况下"处理"算合理

确定的终态处理可以不传播：如任务在 catch 中完成清理后 return，或转换为更合适的异常类型上抛。边缘框架代码（线程工厂的最外层）捕获后记日志是合理的，但记日志必须与恢复标志同时出现，日志本身不是响应。判据一句话：这次中断在你这层有没有明确的下一步？有就做，没有就还回去。

## 案例

### 对照操作：shutdownNow 的三种收敛表现

教学验证：三个相同任务分别用三种写法，线程池 shutdownNow 后统计任务是否在当前批次后停止。预期：恢复标志或向上传播的版本立即收敛；吞中断版本跑完全部批次，且日志无任何取消痕迹。此实验代码简单可复跑，差异稳定，可直接作为团队编码规范的演示样例。

### 追问：不可中断阻塞里的 InterruptedException 怎么办

当阻塞段（如 synchronized 或传统 IO）不抛异常时，中断只会置标志，任务要靠自己在合适的检查点响应 isInterrupted。此时"吞"不是 catch 造成的，而是没有任何检查点——把取消检查放进循环条件与长操作之间，是这类任务唯一的补救。阻塞点与方法签名的对应关系要在评审时对照清楚。

## 总结点

1. catch 即签收，签收要转交
2. 能停就停，不能停就恢复标志
3. 吞一次中断，池子永远关不净
