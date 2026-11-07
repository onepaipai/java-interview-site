<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)

</details>

## 参考回答

1. TreeSet、TreeMap 和 PriorityQueue 不会监听元素字段；入库后修改比较字段会让既有位置与新顺序不一致。
2. 普通排序 List 在元素变化后也不会自行重排；持续有序的约束需要重新排序或更换节点。
3. 优先使用不可变排序键；更新时先按旧键删除再插入新值，尤其树结构中改键后再删可能找不到旧位置。

## 案例

1. 场景（教学示例）：优先队列中任务 B 从优先级 10 调成 1，通过删除旧节点、插入新节点完成更新。

2. 核心代码。

```java
record Task(String id,int priority) {}
var q = new PriorityQueue<Task>(Comparator.comparingInt(Task::priority));
var oldB = new Task("B",10);
q.add(new Task("A",5)); q.add(oldB);
q.remove(oldB); q.add(new Task("B",1));
System.out.println(q.peek().id()+" / "+q.peek().priority());
```

3. 预期：B / 1；另对可变键构造反例，确认直接改字段不触发重排。普通 PriorityQueue 的按对象删除仍为线性成本。

## 总结点

1. 改字段不会自动改顺序。
2. 先删旧键再插入新值。
