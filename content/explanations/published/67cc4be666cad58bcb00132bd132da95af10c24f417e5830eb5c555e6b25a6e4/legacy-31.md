<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 分代利用多数对象短命的统计特征，布局依赖收集器。
2. Minor 常指年轻代回收；Major 和 Full 的含义需按具体实现与日志确认。
3. 并发收集也可能有暂停，不把所有 Full GC 解释成同一固定阶段。

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
