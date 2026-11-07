<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 继承会把子类绑定到父类实现细节，容易破坏替换原则。
2. 通过组合封装规则接口，可分别测试策略并控制扩展影响。

## 参考分析

1. 继承把父类假设暴露给子类。
2. 组合可单独替换折扣、校验等变化点，仍需限制抽象层数。

## 案例

1. 场景（教学示例）：订单优惠从一种规则增加到三种。
2. 处理：定义 PricingPolicy 并注入订单服务，公共状态留在订单聚合内。

3. 验证：新增优惠不修改订单主流程；不同策略通过同一契约测试。

## 总结点

1. 契约用接口。
2. 变化靠组合。
