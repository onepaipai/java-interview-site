<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/LinkedBlockingQueue.html)

</details>

## 参考回答

1. ArrayBlockingQueue 是固定容量数组；LinkedBlockingQueue 是链表队列，默认上限很大，业务使用应显式给容量。
2. OpenJDK 17 前者用一把锁配两个条件，后者分取放两把锁并协调计数；链表多节点分配，数组局部性通常更好。
3. 公平性、竞争、批处理和分配行为都影响结果；先匹配容量与 API 语义，再用代表负载比较吞吐、分配及尾延迟。

## 案例

1. 场景（教学示例）：两种队列都设置容量 2，先验证同一满队列边界，再讨论性能。

2. 核心代码。

```java
var queues = List.<java.util.concurrent.BlockingQueue<Integer>>of(
    new java.util.concurrent.ArrayBlockingQueue<Integer>(2),
    new java.util.concurrent.LinkedBlockingQueue<Integer>(2));
for (var q:queues) System.out.println(q.offer(1)+" / "+q.offer(2)+" / "+q.offer(3));
```

3. 预期：两者都输出 true / true / false；该结果只验证边界等价，不证明哪种更快。性能比较应记录写读比例与 GC。

## 总结点

1. 链式队列也要显式设界。
2. 锁粒度与分配一起比较。
