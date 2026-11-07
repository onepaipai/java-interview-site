<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 基础状态转移为平方复杂度，维护各长度最小结尾并二分可到对数因子。
2. 仅长度与恢复具体序列需要不同辅助信息。

## 参考分析

1. O(n²) DP 直接比较前驱，二分 tails 把每步降为 O(log n)。
2. tails 保存最小结尾而非现成完整序列，恢复需额外前驱信息。

## 案例

1. 场景（教学示例）：数组 [3,1,2,2,4] 求严格递增子序列。

2. 处理：二分找第一个 >= 当前值的位置替换，重复值不能延长；与平方 DP 比较长度。

3. 验证：严格 LIS 长度为 3，可为 [1,2,4]；不是允许相等的长度 4。

## 总结点

1. 严格递增用正确边界。
2. tails 不是现成答案路径。
