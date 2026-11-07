<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/package-summary.html)

</details>

## 参考回答

1. Stream 的中间操作通常延迟到终止操作时遍历；仅建立流水线不会处理全部元素。
2. 短路操作只消费所需元素，优化也可能跳过不影响最终结果的中间操作。
3. 业务写入和必需审计不能依赖 peek 等中间副作用，应建立显式执行边界。

## 参考分析

1. 流描述一次数据处理计划，不是缓存容器；终止后不能再次复用同一个流。
2. 并行流中的副作用还涉及执行顺序和共享状态，不能用顺序流的观察推断安全性。
3. 只用 count 检查 peek 是否执行不可靠，验证应围绕终止结果及业务明确执行步骤。

## 案例

1. 场景（教学示例）：创建倍增流水线后立即检查结果，误以为元素已经处理。

2. 方法体片段：终止前无遍历，toList 才收集本次倍增结果。

```java
var values = java.util.List.of(1, 2, 3);
var doubled = values.stream().map(n -> n * 2);
// 到这里仅建立流水线
System.out.println(doubled.toList()); // [2, 4, 6]
```

3. 验证：结果为 [2,4,6]；需要发送消息时对已确定的结果显式执行发送，不把消息投递塞进 peek。

## 总结点

1. 中间只建计划，终止才消费。
2. 必需副作用，别藏进 peek。
