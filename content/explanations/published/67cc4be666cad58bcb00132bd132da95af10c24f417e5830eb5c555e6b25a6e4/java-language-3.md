<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 BigDecimal API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html)

</details>

## 参考回答

1. double 使用二进制浮点，0.1 等十进制小数通常无法精确表示；金额相等判断与累计可能出现误差。
2. 按币种和精度选择最小货币单位整数或 BigDecimal；十进制输入用字符串构造，并明确舍入位置和规则。
3. 分摊和汇率计算需单独制定尾差规则；换成 BigDecimal 不会自动消除业务舍入差异。

## 案例

1. 场景（教学示例）：比较 0.1+0.2 与 0.3，再计算十进制金额的同一次加法。

2. 代码对照：避免先生成 double 再交给 BigDecimal，以免把已有误差带入。

```java
System.out.println(0.1 + 0.2 == 0.3);
var sum = new java.math.BigDecimal("0.1")
    .add(new java.math.BigDecimal("0.2"));
System.out.println(sum.compareTo(new java.math.BigDecimal("0.3")) == 0);
```

3. 预期：false、true；另测三人分一元的尾差归属、退款负值及溢出上限，不以这个加法样例替代完整金额规则测试。

## 总结点

1. 金额表示和舍入都要约定。
2. 十进制输入别先经过浮点。
