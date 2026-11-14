<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 基本类型存值且不能为 null；包装类型是对象，可表达缺失。
2. Integer.valueOf 至少缓存 -128～127，缓存外不要用 == 比数值。
3. 拆箱先判空；大规模计数减少无意义装箱。

## 参考分析

1. Integer 的缓存身份不能作为业务契约。
2. 循环装箱增加分配，性能应以实际负载验证。

## 案例

1. 场景（教学示例）：接口传入可空数量并与数据库数量比较。
2. 处理：边界先验证非空及范围，用数值比较；内部计数优先基本类型。

3. 验证：边界值和缓存区外数值比较一致；缺失输入返回校验错误。

## 总结点

1. 包装先判空。
2. 数值别比引用。
