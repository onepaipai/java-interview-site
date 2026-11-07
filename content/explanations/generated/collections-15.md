<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. 单键条件更新用 putIfAbsent、replace，计算更新用 compute、merge；各次调用按单键原子执行。
2. OpenJDK 17 通常用空桶 CAS、桶内同步和必要的重试协调更新；同键更新互斥不代表整个 Map 共用一把锁。
3. get 再 put 不是原子组合；值对象内部修改、跨键一致性及外部事务不由 Map 自动保护。
4. 回调保持短小，避免阻塞和递归更新；耗时加载应在外部协调，不能把回调当作通用任务执行器。

## 案例

1. 场景（教学示例）：两个线程累计同一个键，各执行 1000 次。

2. 核心代码。

```java
var counts = new java.util.concurrent.ConcurrentHashMap<String,Integer>();
Runnable add = () -> {
    for (int i = 0; i < 1000; i++) counts.merge("orders", 1, Integer::sum);
};
var a = new Thread(add); var b = new Thread(add);
a.start(); b.start(); a.join(); b.join();
System.out.println(counts.get("orders"));
```

3. 预期：2000；若换成 getOrDefault 后再 put，测试应专门控制交错暴露丢更新，不能把偶然正确当成原子性证明。

## 总结点

1. 单键累计用 merge 或 compute。
2. 容器安全不等于业务整体原子。
