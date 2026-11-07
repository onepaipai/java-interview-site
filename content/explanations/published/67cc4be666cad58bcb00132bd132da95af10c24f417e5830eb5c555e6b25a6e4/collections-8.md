<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/TreeSet.html)

</details>

## 参考回答

1. TreeSet 根据 compare 或 compareTo 是否为 0 判重，equals 不相等也可能只保留一个元素。
2. 按金额排序但要保留不同订单时，应追加订单 ID；排序键需要与业务去重语义一致。
3. 修改入树元素的排序字段不会自动重新排序；优先用不可变键，必要时先删后改再插入。

## 案例

1. 场景（教学示例）：两笔订单金额相同但订单号不同，只按金额比较。

2. 核心代码。

```java
record Order(long id,int cents) {}
var byAmount = new TreeSet<Order>(Comparator.comparingInt(Order::cents));
byAmount.add(new Order(1,100)); byAmount.add(new Order(2,100));
var byAmountId = new TreeSet<Order>(Comparator.comparingInt(Order::cents).thenComparingLong(Order::id));
byAmountId.addAll(List.of(new Order(1,100),new Order(2,100)));
System.out.println(byAmount.size()+" / "+byAmountId.size());
```

3. 预期：1 / 2；“金额相同”是否应合并必须由业务决定，不能把排序相同误当对象相同。

## 总结点

1. 树集合按比较为零判重。
2. 保留同值记录需唯一键。
