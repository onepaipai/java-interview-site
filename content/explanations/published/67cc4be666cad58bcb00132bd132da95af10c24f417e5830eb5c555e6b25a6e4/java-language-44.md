<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 提升计算类型并校验边界，需要明确失败时可用 Math 的精确运算方法。
2. 不能只在赋值后转 long，因为溢出可能已发生。

## 参考分析

1. Java 整数普通运算溢出不会自动报错。
2. 先用 int 乘完再转 long 仍已丢失结果。

## 案例

1. 场景（教学示例）：数量乘单价得到总分金额。
2. 处理：使用 long 参与运算并用 Math.multiplyExact，超范围转换为业务错误。

3. 验证：最大合法输入可算；越界被拒绝且不写入负金额。

## 总结点

1. 先扩类型再运算。
2. 关键运算查溢出。
