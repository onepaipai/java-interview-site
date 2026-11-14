<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 分别寻找第一个不小于目标和第一个大于目标的位置，再推导结果区间。
2. 不要在普通命中后线性扫描重复值。

## 参考分析

1. 左右边界可分别用首个 >= 与首个 > 的二分确定。
2. 普通命中后线扫会在全重复数据上退化 O(n)。

## 案例

1. 场景（教学示例）：[1,2,2,2,4] 中查 2，再查 3。

2. 处理：分别实现 lowerBound 和 upperBound，空区间表示不存在；整体 O(log n)。

3. 验证：2 的位置区间 [1,3]；3 不存在，不返回无效单点；全相等与空数组覆盖。

## 总结点

1. 左右边界分别二分。
2. 不存在时先识别空区间。
