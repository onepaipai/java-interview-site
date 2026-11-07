<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)

</details>

## 参考回答

1. PriorityQueue 维护堆结构，只保证 peek 或 poll 返回最小优先级元素；数组中其他位置不构成全序。
2. 迭代器和 toArray 不承诺有序；要有序输出可反复 poll，或复制后按同一比较器排序。
3. peek 通常 O(1)，入队和出队通常 O(log n)；按对象查找或删除通常 O(n)，不要与按堆顶删除混淆。

## 案例

1. 场景（教学示例）：按 3、1、2 入堆，验证堆顶和逐次取出；不对迭代器顺序做假设。

2. 核心代码。

```java
var q = new PriorityQueue<Integer>();
q.addAll(List.of(3,1,2));
System.out.println(q.peek());
var ordered = new ArrayList<Integer>();
while (!q.isEmpty()) ordered.add(q.poll());
System.out.println(ordered);
```

3. 预期：1、[1, 2, 3]；这里只验证 poll 顺序。直接遍历偶然有序的输入不能证明迭代器有排序保证。

## 总结点

1. 堆只保证堆顶优先。
2. 有序输出逐次取顶或排序。
