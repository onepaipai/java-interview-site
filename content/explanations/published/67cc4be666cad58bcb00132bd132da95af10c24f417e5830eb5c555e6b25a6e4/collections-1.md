<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)
- [github.com · 2](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/HashMap.java)

</details>

## 参考回答

1. 容量按预期元素数和负载因子估算；预分配减少扩容，但会增加空桶与常驻内存。
2. OpenJDK 17 的实际桶数按 2 的幂取整；构造参数不等于可无扩容存放的元素数。
3. 用分配量、写入尾延迟和保留内存比较方案；小 Map 不要过度分配，峰值后必要时重建缩容。

## 参考分析

1. 预期 10000 项时，传 10000 通常得到 16384 个桶，阈值 12288；不是所有 N 都能碰巧避免扩容。
2. 例如传 1000，桶数 1024、阈值 768，写到第 769 项仍会扩容；预估参数 1334 对应 2048 个桶。

## 案例

1. 场景（教学示例）：接口每次组装 1000 项结果；对比默认构造、传 1000、按负载因子预估三种方案。

2. 处理：在 Java 17 中保留默认负载因子，先做容量估算；大数量和非法输入另设上限。

```java
int expected = 1_000;
int capacity = (int) Math.ceil(expected / 0.75d);
var result = new java.util.HashMap<Integer, String>(capacity);
for (int i = 0; i < expected; i++) result.put(i, "v" + i);
System.out.println(capacity + " / " + result.size());
```

3. 结果：输出 1334 / 1000；按 OpenJDK 17 的容量规则推导为 2048 桶、阈值 1536，本批不会因越过阈值扩容。

4. 验证：同一 JDK、数据和预热条件下比较分配与延迟；size 正确不能证明性能提升，也不能证明没有扩容。

## 总结点

1. 容量按元素数除负载因子。
2. 省扩容也要算空桶。
3. 删元素不会自动缩容。
