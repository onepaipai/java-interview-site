<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 先固定闭区间或半开区间约定，让循环与更新保持同一不变式。
2. 中点计算避免溢出，测试空数组、重复值和未命中。

## 参考分析

1. 半开区间 [lo,hi) 的更新必须与循环条件一致。
2. 求插入位置后还要核对实际命中，二分时间 O(log n)、空间 O(1)。

## 案例

1. 场景（教学示例）：[1,2,2,2,4] 中找 2 和不存在的 3。

2. 处理：用 lowerBound 求首个不小于目标的位置，再判断位置在界内且值相等。

```java
int[] a = {1, 2, 2, 2, 4}; int target = 2;
int lo = 0, hi = a.length; // [lo, hi)
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] < target) lo = mid + 1; else hi = mid;
}
System.out.println(lo); // 1；未找到时仍返回插入位置
```

3. 验证：2 的首位置为 1；3 的插入位置为 4，但普通查找应报告未命中；空数组正确。

## 总结点

1. 固定区间不变量。
2. 插入位置还需命中核对。
