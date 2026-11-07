<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html)

</details>

## 参考回答

1. 先确认是否真的需要保留组内明细；只求计数或总额时应使用下游聚合或直接累加，避免每组构造完整列表。
2. 内存主要随分组基数增长，键多时仍可能溢出；可分批落盘、数据库聚合或调整数据分区。
3. 装箱和中间对象是否成为热点需由分配剖析证明；基本类型容器或线程私有累加器也要维护溢出及并发语义。

## 案例

1. 场景（教学示例）：三条记录只需按租户求和，不需要把每组记录再存成 List。

2. 核心代码。

```java
record Event(String tenant,long amount) {}
var totals = new TreeMap<String,long[]>();
for (var e:List.of(new Event("A",2),new Event("A",3),new Event("B",4))) {
    var sum = totals.computeIfAbsent(e.tenant(),key->new long[1]);
    sum[0] = Math.addExact(sum[0],e.amount());
}
totals.forEach((key,value)->System.out.println(key+"="+value[0]));
```

3. 预期：A=5、B=4；该累加器仅限单线程。与 groupingBy 后保存明细的方案比较分配量，同时核对同等分组与溢出规则。

## 总结点

1. 只要聚合就别保留全量明细。
2. 分组内存仍受键基数控制。
