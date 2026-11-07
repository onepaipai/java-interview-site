<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/TreeMap.html)

</details>

## 参考回答

1. 需要按键排序、范围查询或最近边界时选 TreeMap，如时间窗口和区间配置；红黑树让 get、put、remove 保持 O(log n)。
2. floorEntry、ceilingEntry 能直接查相邻边界，subMap 返回指定开闭区间的视图；HashMap 需要另行排序或扫描。
3. 比较器返回 0 的键被视为同键，应与业务相等语义一致；范围视图共享原 Map，默认也不提供并发安全。

## 案例

1. 场景（教学示例）：按时间刻度管理窗口，查询不晚于 25 的最近边界和区间 [10,30)。

2. 核心代码。

```java
var windows = new java.util.TreeMap<Integer,String>();
windows.put(10, "A"); windows.put(20, "B"); windows.put(30, "C");
System.out.println(windows.floorKey(25));
var range = windows.subMap(10, true, 30, false);
System.out.println(range.keySet());
range.remove(10);
System.out.println(windows.keySet());
```

3. 预期：20、[10, 20]、[20, 30]；验证上界排除及视图修改回写原表。需要独立快照时另行复制。

## 总结点

1. 树结构适合范围与边界。
2. subMap 是共享视图。
