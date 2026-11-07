<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 键字段变化会使哈希定位和业务身份失去一致性，缓存失效也难以追踪。
2. 使用稳定且不可变的标识，并明确租户及版本维度。

## 参考分析

1. 哈希集合先定位桶再比较相等性，两者契约不能割裂。
2. 键入表后修改参与哈希的字段，会让元素留在旧桶。

## 案例

1. 场景（教学示例）：账户缓存键包含租户和账户编号。
2. 处理：用不可变复合键，分别验证同值查找和跨租户隔离。

```java
record AccountKey(long tenantId, long accountId) {}
var cache = new java.util.HashMap<AccountKey, String>();
cache.put(new AccountKey(10, 1), "账户信息");
System.out.println(cache.get(new AccountKey(10, 1))); // 账户信息
```

3. 验证：同值键取到原值，不同租户互不覆盖；可变字段不参与身份。

## 总结点

1. 相等必同哈希。
2. 入表键不变。
