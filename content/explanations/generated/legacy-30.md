<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 标记清除回收死对象但可能产生碎片。
2. 复制减少碎片并适合存活少的区域，需额外空间。
3. 标记整理移动存活对象获得连续空间；实际收集器会组合多种机制。

## 参考分析

1. Minor、Major、Full 等名称并非所有收集器统一。
2. 大对象和晋升行为取决于区域大小与存活率。
3. 并发不等于零暂停。

## 案例

1. 场景（教学示例）：大批 JSON 处理后老年代占用快速上升。
2. 处理：关联分配、存活与 GC 日志，分批处理并限制对象峰值，避免无证据显式 GC。

3. 验证：晋升压力和暂停变化可解释；优化以相同负载的日志比较为准。

## 总结点

1. 并发仍有暂停。
2. 先看分配与存活。
