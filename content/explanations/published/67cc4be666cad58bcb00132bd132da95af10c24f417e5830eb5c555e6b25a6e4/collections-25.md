<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/SynchronousQueue.html)

</details>

## 参考回答

1. SynchronousQueue 不保存元素；一次放入必须与另一个线程的取出配对，容量始终为零。
2. offer 没有接收者就返回 false；限时 offer 等待接收者，put 可一直等到配对或被中断。
3. 构造参数只能选择公平性，不能设置缓冲容量；需要缓冲时另选 ArrayBlockingQueue 等结构。

## 案例

1. 场景（教学示例）：先在没有接收线程时交接，再启动接收者；最后验证无接收者的超时。

2. 核心代码：使用实际线程完成一次交接；不使用 sleep 猜测接收线程是否已就绪。

```java
var q = new java.util.concurrent.SynchronousQueue<Integer>();
System.out.println(q.offer(1));
var receiver = new java.util.concurrent.FutureTask<Integer>(q::take);
var thread = new Thread(receiver);
thread.start();
System.out.println(q.offer(7, 2, java.util.concurrent.TimeUnit.SECONDS));
System.out.println(receiver.get(2, java.util.concurrent.TimeUnit.SECONDS));
thread.join();
System.out.println(q.remainingCapacity());
System.out.println(q.offer(9, 5, java.util.concurrent.TimeUnit.MILLISECONDS));
```

3. 预期：依次为 false、true、7、0、false；再测试中断阻塞的 take，应抛 InterruptedException，不能靠塞入一个缓冲元素解锁。

## 总结点

1. 零容量靠双方交接。
2. 限时 offer 等接收者。
