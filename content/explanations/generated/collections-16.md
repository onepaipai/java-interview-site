<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. containsKey 与 put 分开调用会留下竞态；即使外层是 ConcurrentHashMap，两线程仍可都观察到不存在。
2. putIfAbsent 把“缺失才写入”作为单键原子操作，返回旧值；返回 null 表示本次成功占位。
3. 创建候选对象可能仍执行多次；有副作用或昂贵加载不能靠 putIfAbsent 自动做到只执行一次。

## 案例

1. 场景（教学示例）：两个候选值争抢同一键，以原子返回值决定谁创建成功。

2. 核心代码。

```java
var map = new java.util.concurrent.ConcurrentHashMap<String,String>();
System.out.println(map.putIfAbsent("order","A"));
System.out.println(map.putIfAbsent("order","B"));
System.out.println(map.get("order"));
```

3. 预期：null、A、A；并发时胜者不固定，但只能有一个调用返回 null。外部副作用需另设幂等或事务边界。

## 总结点

1. 缺失判断与写入要原子。
2. 占位一次不等于构造一次。
