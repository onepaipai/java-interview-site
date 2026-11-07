<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Comparator.html)

</details>

## 参考回答

1. 分页排序要用业务字段加唯一键打破平局；排序字段相同而没有裁决时，跨次查询的相对顺序可能变化。
2. 唯一排序只解决平局，不能阻止并发插入让 offset 位移；游标分页应按相同复合键继续，并明确定义新插入数据是否可见。
3. 要求完整稳定批次时还需一致性快照或冻结集合；排序键在读取中修改同样可能导致重读和漏读。

## 案例

1. 场景（教学示例）：同一时间的订单编号 101、102、103，每页 2 条；第一页后插入更小编号 100。

2. 核心代码。

```java
var ids = new ArrayList<>(List.of(101,102,103));
var first = List.copyOf(ids.subList(0,2));
ids.add(100); ids.sort(Integer::compare);
System.out.println(first);
System.out.println(ids.stream().skip(2).limit(2).toList());
System.out.println(ids.stream().filter(id->id>102).limit(2).toList());
```

3. 预期：[101, 102]、[102, 103]、[103]；offset 重复 102，游标避开此插入位移，但不代表拥有完整历史快照。

## 总结点

1. 唯一排序只解决平局。
2. 并发翻页还要定义快照语义。
