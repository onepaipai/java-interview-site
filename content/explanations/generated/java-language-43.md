<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 比较器必须满足传递性与一致的符号规则，排序返回零会影响 TreeSet 去重。
2. 避免用减法比较可能溢出的整数。

## 参考分析

1. compare 返回零会被 TreeSet 当作同一键。
2. 减法比较可能溢出，应使用 compare 方法。

## 案例

1. 场景（教学示例）：按金额排序且金额相同的订单都要保留。
2. 处理：比较金额后再比较订单号，使用不可变排序键。

3. 验证：同金额订单不丢失；极值与逆序数据仍有确定顺序。

## 总结点

1. 排序零即同键。
2. 并列必须加次序。
