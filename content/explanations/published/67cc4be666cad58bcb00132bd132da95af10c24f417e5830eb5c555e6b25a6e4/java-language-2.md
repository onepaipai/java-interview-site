<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 BigDecimal API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html)

</details>

## 参考回答

1. 金额用十进制精确输入，把币种、精度和舍入规则一起建模。
2. 数值比较用 compareTo；作为集合键前统一金额表示，避免 scale 导致相等性差异。
3. 输入校验与结算舍入分开；统一逐笔或汇总口径，并规定尾差归属。

## 参考分析

1. new BigDecimal(0.1) 接收的是二进制近似值；改成 BigDecimal 并不会自动还原用户输入的 0.1。
2. 1.0 与 1.00 数值相等但 equals 不等；HashMap 和 TreeMap 因比较依据不同，可能得到不同的键数量。
3. scale 是小数位数，precision 是有效数字位数；MathContext(2) 不代表保留两位小数。
4. BigDecimal 不可变，setScale、add 都返回新对象；忽略返回值等于没有修改金额。
5. 统一保留两位并不适合全部币种、汇率和中间计算；边界处按业务规则定标，避免中途反复舍入。

## 案例

1. 场景（教学示例）：核对金额键、输入精度及三笔 0.005 元费用的结算尾差。

2. 处理：分别验证数值比较、逐笔舍入和汇总后舍入；规则只用于本例，不代表所有结算口径。

```java
var a = new java.math.BigDecimal("1.0");
var b = new java.math.BigDecimal("1.00");
System.out.println(a.equals(b) + " / " + a.compareTo(b));
var fee = new java.math.BigDecimal("0.005");
var mode = java.math.RoundingMode.HALF_UP;
var perItem = fee.setScale(2, mode).multiply(new java.math.BigDecimal("3"));
var total = fee.multiply(new java.math.BigDecimal("3")).setScale(2, mode);
System.out.println(perItem + " / " + total);
try {
    fee.setScale(2, java.math.RoundingMode.UNNECESSARY);
    throw new AssertionError("invalid amount accepted");
} catch (ArithmeticException expected) {
    System.out.println("precision rejected");
}
```

3. 结果：依次输出 false / 0、0.03 / 0.02、precision rejected；差的 0.01 必须按选定口径分配。

4. 验证：补测负数退款、除数为零、1/3、不同币种；校验失败不得通过默认舍入继续入账。

## 总结点

1. 字符串保真，币种定标。
2. 比较数值用 compareTo。
3. 舍入时点决定尾差。
