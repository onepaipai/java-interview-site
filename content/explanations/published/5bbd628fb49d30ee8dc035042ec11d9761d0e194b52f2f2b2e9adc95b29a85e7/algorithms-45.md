<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 按前缀定义二维状态，字符相同延长共同序列，否则舍弃一侧取最优。
2. 恢复结果需保存路径，不能与连续子串问题混淆。

## 参考分析

1. 公共子序列允许跳过字符，公共子串要求连续。
2. 二维转移 O(mn)，恢复序列要沿合法来源回溯。

## 案例

1. 场景（教学示例）：字符串 abcde 与 ace。

2. 处理：相等则 dp[i-1][j-1]+1，否则 max(dp[i-1][j],dp[i][j-1])；从完整状态取值。

3. 验证：LCS 长度 3，对应 ace；不能因连续公共片段短而误报 1。

## 总结点

1. 子序列允许跳过。
2. 不等时舍弃一侧前缀。
