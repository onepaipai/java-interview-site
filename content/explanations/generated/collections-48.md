<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentLinkedQueue.html)

</details>

## 参考回答

1. isEmpty 与 poll 是两次独立观察，空检查后另一个消费者可能先拿走元素；并发容器也不能替这两个调用建立原子组合。
2. 直接根据 poll 返回值决定是否拿到任务；需要等待时使用阻塞队列的 take 或限时 poll，并处理超时与中断。
3. 队列只保证交付协议，不自动保证业务处理成功或完成次序；幂等、确认与重试应在消费协议中另外定义。

## 案例

1. 场景（教学示例）：消费者 A 检查非空后，B 先取走唯一任务；用顺序代码模拟该交错。

2. 核心代码。

```java
var q = new java.util.concurrent.ConcurrentLinkedQueue<String>();
q.offer("task");
boolean seen = !q.isEmpty();
q.poll(); // B 先取走
System.out.println(seen+" / "+q.poll());
```

3. 预期：true / null；检查非空不代表随后能取到。修复后只使用取出方法的原子返回结果，避免对 null 解引用。

## 总结点

1. 先检查再取出仍有竞态。
2. 业务依据实际取出结果。
