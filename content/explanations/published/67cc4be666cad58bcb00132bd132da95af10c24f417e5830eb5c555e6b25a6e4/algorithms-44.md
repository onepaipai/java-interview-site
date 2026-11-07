<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 状态表示两个前缀的最小变换成本，根据插入、删除、替换选最小。
2. 初始化空前缀，并说明字符比较与成本是否统一。

## 参考分析

1. dp[i][j] 表示两个前缀的最小编辑成本。
2. 插入、删除、替换对应三个相邻状态，字符相同替换成本为零。

## 案例

1. 场景（教学示例）：单位编辑成本均为 1，把 kitten 变为 sitting。

2. 处理：初始化空前缀距离，按长度递增填表；若只求值可滚动压缩，恢复操作需额外信息。

3. 验证：距离为 3；空串到 abc 为 3，时间 O(mn)，字符单位按需求固定。

## 总结点

1. 状态对应两个前缀。
2. 三类操作取最小。
