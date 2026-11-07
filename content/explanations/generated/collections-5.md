<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

1. HashMap 迭代成本与容量加元素数相关；迭代器既要找非空桶，也要访问桶内条目。
2. 曾经很大但已删空的表不会自动缩容，低密度大表反复遍历会扫描大量空桶。
3. 可在可控时机重建较小表，或按顺序需求选 LinkedHashMap；重建要计入复制时间、额外内存及并发切换成本。

## 案例

1. 场景（教学示例）：大表删除到只剩一个条目，比较它与紧凑副本的全量遍历。

2. 验证：两者键值完全相同；用相同迭代方式在 JMH 比较稀疏与紧凑表，记录容量、分配及误差。此处不预设固定耗时收益。

## 总结点

1. 遍历成本含空桶扫描。
2. 删除不等于自动缩容。
