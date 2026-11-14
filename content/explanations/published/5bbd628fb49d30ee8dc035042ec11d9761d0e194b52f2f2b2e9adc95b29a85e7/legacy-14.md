<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. HashMap 不提供共享修改安全，支持 null 键值；Hashtable 是遗留同步表，禁止 null，但多次方法调用仍不是业务原子事务。
2. ConcurrentHashMap 禁止 null，提供单键原子更新与并发读取；不能把某版本的分段锁或 CAS 概括成所有版本统一实现。
3. get 后 put 在后两者中也不是原子累计；使用 merge、compute 或统一外部锁，跨键一致性仍需另设协议。

## 案例

1. 场景（教学示例）：同一业务计数通过 ConcurrentHashMap.merge 累加两次，避免分离读改写。

2. 核心代码。

```java
var counts = new java.util.concurrent.ConcurrentHashMap<String,Integer>();
counts.merge("A",1,Integer::sum); counts.merge("A",1,Integer::sum);
System.out.println(counts.get("A"));
try { new Hashtable<String,String>().put("A",null); }
catch (NullPointerException expected) { System.out.println("null rejected"); }
```

3. 预期：2、null rejected；并发测试需对比 get/put 的丢更新交错，不把“每次调用线程安全”当成整段业务原子。

## 总结点

1. 线程安全方法不组合成事务。
2. 共享累计用单键原子接口。
