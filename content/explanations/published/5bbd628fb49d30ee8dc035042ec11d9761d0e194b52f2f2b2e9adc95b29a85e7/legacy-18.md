<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.State.html)

</details>

## 参考回答

1. 进程通常提供独立地址空间与资源隔离，线程共享所属进程的内存等资源，同时具有自己的栈和执行上下文。
2. Java 状态包括 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED；不是操作系统状态的一一映射。
3. RUNNABLE 不等于正在占 CPU，BLOCKED 特指监视器进入阻塞；诊断还要结合连续栈、等待对象与业务进展。

## 案例

1. 场景（教学示例）：观察一个平台线程启动之前与正常结束之后的 Java 状态。

2. 启动后限时 join，并确认实际结束再读取终态。

```java
var worker=new Thread(()->{});
System.out.println(worker.getState());
worker.start(); worker.join(2000);
if(worker.isAlive()) throw new AssertionError("not terminated");
System.out.println(worker.getState());
```

3. 预期：NEW、TERMINATED；不能靠一次采样推断中间经历过哪些等待，更不能把所有等待归为故障。

## 总结点

1. Java 状态不是操作系统状态表。
2. 线程状态必须结合进展看。
