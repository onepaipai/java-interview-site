<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. OpenJDK 17 HashMap 扩容通常把桶按旧容量位拆成两组。
2. 长链达到树化条件时还检查表容量；容量不足优先扩容，精确触发看版本代码。
3. JDK 7 并发扩容有历史环链风险，但任何版本 HashMap 都不支持无同步并发写。

## 参考分析

1. OpenJDK 17 的树化还受表容量影响，不能只背链长阈值。
2. 遍历开销与容量和元素数都相关。

## 案例

1. 场景（教学示例）：导入百万条记录并按业务键去重。
2. 处理：估算容量，使用不可变复合键，记录冲突分布、分配量和遍历耗时。

```java
record AccountKey(long tenantId, long accountId) {}
var cache = new java.util.HashMap<AccountKey, String>();
cache.put(new AccountKey(10, 1), "账户信息");
System.out.println(cache.get(new AccountKey(10, 1))); // 账户信息
```

3. 验证：键相等时正确去重；扩容减少但不过量预分配，不能用此结构替代并发 Map。

## 总结点

1. 键稳定再入表。
2. 容量与空间一起算。
