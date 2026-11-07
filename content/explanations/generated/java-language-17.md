<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html#toMap(java.util.function.Function,java.util.function.Function))

</details>

## 参考回答

1. 两参数 toMap 遇到重复键会抛 IllegalStateException，必须先定义冲突规则。
2. 可选择拒绝重复、保留某条或合并字段；并行归约的合并规则应满足相应结合要求。
3. 需要稳定遍历顺序时明确输入顺序及 Map 工厂，同时预先处理 null 和同版本冲突。

## 参考分析

1. 重复键是数据规则问题，不应靠捕获异常后随意丢弃某条记录解决。
2. 按最高版本合并时，同版本不同内容仍需单独拒绝或定义裁决，不能默认“最高”就唯一。
3. LinkedHashMap 可保留插入顺序，但不会替你定义业务版本或输入顺序。

## 案例

1. 场景（教学示例）：导入订单 A 的版本 1、2，以及订单 B 的版本 1。

2. 核心片段：重复订单按最高版本合并，并选择 LinkedHashMap；同版本冲突在进入前校验。

```java
record Row(String id, int version) {}
var rows = java.util.List.of(
    new Row("A", 1), new Row("A", 2), new Row("B", 1));
var result = rows.stream().collect(
    java.util.stream.Collectors.toMap(
        Row::id, java.util.function.Function.identity(),
        java.util.function.BinaryOperator.maxBy(
            java.util.Comparator.comparingInt(Row::version)),
        java.util.LinkedHashMap::new));
System.out.println(result.get("A").version()); // 2
```

3. 验证：A 保留版本 2，B 保留版本 1；再覆盖重复同版本不同内容、空输入和 null 的既定规则。

## 总结点

1. 重复键先定合并规则。
2. 顺序显式选，同版本别含糊。
