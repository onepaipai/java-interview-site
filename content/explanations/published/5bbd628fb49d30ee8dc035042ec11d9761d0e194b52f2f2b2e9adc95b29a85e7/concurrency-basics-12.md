<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ThreadLocal.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：主线程设置 traceId 后向固定线程池提交任务，期望任务内日志带同一 traceId。用 InheritableThreadLocal 实测首个任务有值、后续任务丢失或串值，推演复制时机与线程复用的冲突。

1. InheritableThreadLocal 只在子线程被创建（new Thread）时从父线程复制一次，之后父线程的修改不再同步。
2. 线程池的工作线程在提交任务之前就已创建，复制早已发生，任务读到的是工作线程诞生时的旧值，与提交时的上下文无关。
3. 正确做法是装饰任务：提交时捕获当前上下文，运行时在工作线程里 set，结束时 remove；这也是 TransmittableThreadLocal 与手动包装的原理。

## 参考分析

### 机制：复制绑定在线程诞生，不绑定在任务提交

可继承 ThreadLocal 的复制发生在 Thread.init：父线程此刻的 inheritableThreadLocals 被拷贝给新生儿。类比入职当天发的工作证：照片是入职那天的，之后你换了发型，证件不会自动更新。池化线程"入职"很早，之后成千上万个任务带着各自的 traceId 提交进来，工作线程的证件永远是旧的。

### 故障推演：首个任务侥幸正确更危险

若池在请求路径中才懒创建，第一个任务恰好在创建线程时复制到正确 traceId——测试通过；第二个请求提交时线程已存在，读到第一次的 traceId，日志归属错乱，排障时把两起事故串成一起。侥幸正确比立即失败更有害，因为它把 bug 藏过了冒烟测试。

### 取舍：传递要走"提交时快照、运行时恢复"

实现统一收口：提交入口捕获当前上下文（不可变快照），包装 Runnable 在 run 前后 set/remove。TTL 做的是同样的事但对接了池化回调，代价是需替换线程池工厂并注意嵌套提交。Java 21 的 ScopedValue 是更干净的方向，但 Java 17 项目用不到；不要为了用而升级依赖，先量上下文传递的真实频率。

## 案例

### 对照操作：第一次对、第二次错的复现

教学验证：惰性创建 2 线程池；请求 1 设置 traceId=T1 提交任务（此时创建线程），请求 2 设置 T2 提交任务。预期任务 1 日志为 T1，任务 2 仍为 T1（复制未再发生）；换成提交时捕获的装饰版本后任务 2 为 T2。实验可复跑，结论与 Thread.init 的语义一致。

### 追问：为什么不在任务里手动读一遍主线程变量

任务代码拿不到"提交它的那一刻"的引用——主线程早已继续执行，变量可能已变。这就是"提交时快照"必须由提交入口统一完成的原因：把时机固定下来，而不是让每个任务自己想办法。任何依赖任务自觉的方案都会在第一个忘写的调用点失效。

## 总结点

1. 复制在人职时，不跟任务走
2. 首个任务对，后面全串线
3. 提交拍快照，运行再恢复
