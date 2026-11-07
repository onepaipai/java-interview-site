<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

1. Runnable 描述无返回值任务，Callable 可返回结果并抛异常；可交由 Thread 或受控执行器运行，任务与线程是不同概念。
2. start 创建并调度一次新的执行，直接调用 run 只是当前线程的普通方法调用；同一个 Thread 不能重复 start。
3. 线上明确线程数、队列、命名、异常观察和关闭策略；Java 17 例子不混入仅后续 JDK 提供的虚拟线程 API。

## 案例

1. 场景（教学示例）：同一段 run 先被直接调用，再通过真正的新线程执行。

2. 分别记录代码执行者是否还是调用线程。

```java
var caller=Thread.currentThread(); var result=new AtomicBoolean();
Runnable work=()->result.set(Thread.currentThread()==caller);
work.run(); System.out.println(result.get());
var worker=new Thread(work); worker.start(); worker.join(2000);
if(worker.isAlive()) throw new AssertionError("not terminated");
System.out.println(result.get());
```

3. 预期：true、false；任务相同，执行载体不同。后者先完成再由 join 建立结果观察关系。

## 总结点

1. 任务不是线程。
2. 直接 run 不会创建新执行线程。
