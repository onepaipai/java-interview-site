<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/BlockingQueue.html)

</details>

## 参考回答

1. 有界队列通过 offer 失败、限时等待或生产者阻塞暴露过载；边界只有被上游正确处理才形成背压。
2. 用可持续处理速率与允许排队时间估算容量，还需按任务占用内存和突发量校验，不能只靠加大队列。
3. 提交超时后不能无限重试或转入另一条无界队列；明确拒绝、持久化移交及停机唤醒策略。

## 案例

1. 场景（教学示例）：容量为 1 的缓冲区先填满，再尝试交付第二条任务。

2. 核心代码。

```java
var q = new java.util.concurrent.ArrayBlockingQueue<String>(1);
System.out.println(q.offer("A"));
System.out.println(q.offer("B"));
System.out.println(q.poll());
System.out.println(q.remainingCapacity());
```

3. 预期：true、false、A、1；队满时需向上游反馈，不能把 false 忽略后仍返回成功。再按实际负载验证排队时长和拒绝率。

## 总结点

1. 容量边界要传回上游。
2. 积压预算同时看时间和内存。
