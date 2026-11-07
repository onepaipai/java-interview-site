<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

1. 先定义业务顺序：保留输入顺序用 List、LinkedHashSet 或 LinkedHashMap；按键排序用 TreeSet、TreeMap 或显式排序。
2. 保留遇到顺序需要上游本身有确定顺序；把 HashMap 复制到 LinkedHashMap，只会保留本次观察到的顺序。
3. 并行流使用有序终端和收集方式；排序比较器补上唯一键作为平局规则，分页等场景还要约定一致的数据快照。

## 案例

1. 场景（教学示例）：输入 B、A、B，分别验证“保留首次出现”和“按键排序”两种需求。

2. 核心代码。

```java
var input = java.util.List.of("B", "A", "B");
var encounter = new java.util.LinkedHashSet<>(input);
var sorted = new java.util.TreeSet<>(input);
System.out.println(encounter);
System.out.println(sorted);
```

3. 预期：[B, A] 与 [A, B]；将输入打乱后，前者随输入改变而后者仍排序。真实分页还需补测相同排序字段的唯一键裁决。

## 总结点

1. 容器只维护已定义的顺序。
2. 确定排序要有平局规则。
