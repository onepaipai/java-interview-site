<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Comparator.html)

</details>

## 参考回答

1. 比较器应满足符号反对称、传递性及比较相等的一致性；排序期间依赖的字段不能随机变化，否则结果不可靠且可能报错。
2. 整数比较用 Integer.compare 等方法，不能直接相减，极值相减可能溢出；空值与浮点 NaN 也要有明确顺序。
3. 多字段排序用 thenComparing 明确优先级；稳定排序保留相等项输入顺序，与比较器满足契约是两个不同概念。

## 案例

1. 场景（教学示例）：比较最小整数与 1，展示相减比较的方向反转。

2. 核心代码。

```java
int a = Integer.MIN_VALUE, b = 1;
System.out.println(a-b>0);
System.out.println(Integer.compare(a,b));
var values = new ArrayList<>(List.of(b,a));
values.sort(Integer::compare);
System.out.println(values.get(0));
```

3. 预期：true、-1、-2147483648；错误减法把更小的值当成更大。另用三元组验证传递性，不能只测几组正常正整数。

## 总结点

1. 比较大小不要直接相减。
2. 比较器契约不同于排序稳定性。
