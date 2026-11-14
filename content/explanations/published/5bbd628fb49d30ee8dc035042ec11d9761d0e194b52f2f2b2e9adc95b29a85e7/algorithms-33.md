<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 采用入度队列不断删除零入度节点，处理数少于总数说明存在环。
2. 如需具体环路径，可补充深度优先状态与父路径。

## 参考分析

1. 入度归零表示所有前驱已处理，处理数不足说明有环阻碍。
2. 拓扑序可能不唯一，查具体环需额外路径信息，时间 O(V+E)。

## 案例

1. 场景（教学示例）：A→B、A→C、B→D、C→D，随后增加 D→A。

2. 处理：零入度节点入队，出队后递减后继入度，统计处理总数。

3. 验证：原图可输出 A,B,C,D 或 A,C,B,D；加回边后报告有环，不输出伪完整排序。

## 总结点

1. 零入度才能执行。
2. 处理不足说明有环。
