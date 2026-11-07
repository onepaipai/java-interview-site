<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 BigDecimal API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html)

</details>

## 参考回答

1. 按币种和业务环节明确精度及舍入时点，记录原始值和舍入差额。
2. 分项舍入与汇总舍入结果可能不同，需要约定口径。

## 参考分析

1. 十进制精确表示也不能消除不同舍入口径的差异。
2. 分项舍入与合计舍入不等价，差额必须按约定记账，不能反复二次舍入。

## 案例

1. 场景（教学示例）：三项各 0.005，教学规则采用 HALF_UP 保留两位。

2. 处理：分别比较逐项舍入后求和与求和后舍入；确定唯一结算口径并记录原值和差额。

```java
var x = new java.math.BigDecimal("0.005");
var mode = java.math.RoundingMode.HALF_UP;
var perLine = x.setScale(2, mode).multiply(java.math.BigDecimal.valueOf(3));
var atTotal = x.multiply(java.math.BigDecimal.valueOf(3)).setScale(2, mode);
System.out.println(perLine + " / " + atTotal); // 0.03 / 0.02
```

3. 验证：前者 0.03，后者 0.02，差 0.01；结算与分摊合计应按约定口径核对。

## 总结点

1. 精确小数仍需统一舍入。
2. 舍入时点就是业务规则。
