<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Record.html)

</details>

## 参考回答

1. 优先使用按完整字段比较的不可变键，例如 record；equals 相等必须有相同 hashCode，不同哈希冲突仍按 equals 区分。
2. 无分隔拼接会把不同字段合为同一串；有分隔符也要处理字段内包含分隔符、null 和编码标准化。
3. 键包含数组或可变对象时，record 不自动提供内容比较与深不可变；要防御性复制并定义内容相等规则。

## 案例

1. 场景（教学示例）：租户与账户两段标识用直接拼接，出现 1+23 与 12+3 冲突。

2. 核心代码。

```java
record AccountKey(String tenant,String account) {}
System.out.println(("1"+"23").equals("12"+"3"));
var values = new HashMap<AccountKey,String>();
values.put(new AccountKey("1","23"),"A");
values.put(new AccountKey("12","3"),"B");
System.out.println(values.size());
```

3. 预期：true、2；补测空字段、分隔符与大小写规则。把两个字段的 hashCode 拼成键同样不能避免碰撞。

## 总结点

1. 组合键比较完整字段。
2. record 不提供自动深不可变。
