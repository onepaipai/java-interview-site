<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [github.com · 1](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/ArrayList.java)

</details>

## 参考回答

1. 容量不足时 ArrayList 分配新数组并复制原元素引用，单次追加可能从常见 O(1) 摊销成本变成 O(n)。
2. OpenJDK 17 常规增长约 1.5 倍，大批量追加还受最小所需容量约束；临时新旧数组会增加分配峰值。
3. 已知规模时合理 ensureCapacity 或预设容量，流式处理限制单批大小；不要在每次追加前 trimToSize。

## 案例

1. 场景（教学示例）：请求内逐项追加十万条结果，尾部某次追加触发整数组复制。

2. 验证：对比默认容量、合理预分配和分批输出，检查分配热点及追加耗时分布；吞吐平均值不足以证明请求尾延迟改善。

## 总结点

1. 摊销常数不等于每次常数。
2. 预留容量也要限制峰值。
