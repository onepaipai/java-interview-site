<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 含嵌套回溯的表达式在特定输入下可能耗时失控。
2. 限制输入长度，改写歧义模式，对可疑规则使用基准和恶意样本验证。

## 参考分析

1. String.length 统计 UTF-16 单元。
2. 表情可能由多个码点组成，按 char 截断会破坏字符。

## 案例

1. 场景（教学示例）：昵称含组合表情且长度超限。
2. 处理：按产品定义的字符单位校验；对恶意长串和重复后缀做限时压测。

3. 验证：不产生半个代理对；恶意输入在预算内拒绝而非拖满 CPU。

## 总结点

1. 字符单位先说明。
2. 正则输入先限长。
