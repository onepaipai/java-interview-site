<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 等权边可用 BFS，特定零一权重可用双端队列，非负一般权重用 Dijkstra。
2. 先根据边权性质选算法而非套模板。

## 参考分析

1. BFS 优化边数只在等权时对应最小代价。
2. 0/1 权用双端队列，任意非负权可用 Dijkstra，不能只看数据是网格。

## 案例

1. 场景（教学示例）：S→T 代价 1，S→A 与 A→T 代价都为 0。

2. 处理：先分类边权；本例用 0-1 BFS，0 权入队首、1 权入队尾；一般非负权用堆。

3. 验证：最短代价为 0，不是边数最少路线的 1；负权不直接套 Dijkstra。

## 总结点

1. 先看边权再选算法。
2. 最少边不一定最小代价。
