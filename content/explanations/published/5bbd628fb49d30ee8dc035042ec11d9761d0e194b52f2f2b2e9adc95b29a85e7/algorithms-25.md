<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 遍历时统计此前前缀和值出现次数，当前和减目标的出现次数即新增答案。
2. 先计入空前缀，累加类型注意溢出。

## 参考分析

1. 以当前前缀和减目标查历史出现次数，可统计所有不同起点。
2. 先查再登记当前前缀，初始化空前缀，避免漏从头开始的区间。

## 案例

1. 场景（教学示例）：数组 [1,-1,1]，目标和 1。

2. 处理：用 long 累加，频次表先放 0→1；逐项查询 sum-target，再增加 sum 计数。

```java
long sum = 0, count = 0, target = 1;
var seen = new java.util.HashMap<Long, Long>();
seen.put(0L, 1L);
for (int x : new int[]{1, -1, 1}) {
    sum += x;
    count += seen.getOrDefault(sum - target, 0L);
    seen.merge(sum, 1L, Long::sum);
}
System.out.println(count); // 3
```

3. 验证：答案为 3；重复前缀不能只存是否存在，时间平均 O(n)、空间 O(n)。

## 总结点

1. 先查历史再登记。
2. 频次不能简化成集合。
