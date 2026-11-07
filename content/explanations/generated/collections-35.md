<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)

</details>

## 参考回答

1. 取最大的 K 项时维护大小最多 K 的最小堆，堆顶是当前候选中最弱者；新项超过堆顶才有保留价值。
2. 典型时间 O(n log K)、额外空间 O(K)，适合 K 远小于 n；K 接近 n 时应比较全排序或选择算法的成本。
3. 明确 K=0、负数、K 大于总量及并列规则；堆内遍历不保证最终展示顺序，输出前需另行排序。

## 案例

1. 场景（教学示例）：从 3、1、4、1、5 选最大的两项，允许重复数值独立占位。

2. 核心代码。

```java
int k = 2;
var heap = new PriorityQueue<Integer>();
for (int value:List.of(3,1,4,1,5)) {
    heap.offer(value);
    if (heap.size()>k) heap.poll();
}
var result = new ArrayList<>(heap);
result.sort(Comparator.reverseOrder());
System.out.println(result);
```

3. 预期：[5, 4]；以全排序取前 K 作参照，补测 K=0、重复极值及 K 超总量。负 K 在接口入口拒绝，本例固定 K=2。

## 总结点

1. 最大 K 用最小候选堆。
2. 候选堆不是最终展示顺序。
