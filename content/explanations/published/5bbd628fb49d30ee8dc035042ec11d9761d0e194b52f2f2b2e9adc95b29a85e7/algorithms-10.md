<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 修改当前节点指向前，先保存下一节点以免丢失剩余链表。
2. 维护前驱、当前、后继三个状态，覆盖空表和单节点。

## 参考分析

1. 覆盖 next 前必须保存后继，否则剩余链表可能丢失。
2. 循环不变式是已反转前缀与待处理后缀，时间 O(n)、额外空间 O(1)。

## 案例

1. 场景（教学示例）：链表 1→2→3 需要原地反转。

2. 处理：依次维护 prev、current、next，改变指向后继续后继；不新建节点。

```text
prev = null; current = head
while current != null:
    next = current.next
    current.next = prev
    prev = current
    current = next
return prev
```

3. 验证：返回 3→2→1，末尾指向 null；空表和单节点正确，无环且节点身份保留。

## 总结点

1. 先保存后继。
2. 再改当前指针。
