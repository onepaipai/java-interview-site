<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 确定最短路径的贪心步骤依赖非负边权，负边会破坏此前结论。
2. 优先队列实现还需处理旧距离条目与溢出。

## 案例

1. 场景（教学示例）：S→A 为 2，S→B 为 5，B→A 为 -10。

2. 处理：说明 A 若在 2 时定案且不重开，就漏掉 -5；负权按模型选择 Bellman-Ford 等合适算法。

3. 验证：负边样例真实最短值为 -5；非负图再用 Dijkstra 与小图对照验证。

## 总结点

1. 贪心定案先验非负边。
2. 旧堆条目必须跳过。
