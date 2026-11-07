<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html)

</details>

## 参考回答

1. CopyOnWriteArrayList 的写操作复制底层数组，读和迭代使用已发布的数组快照，适合规模受控、读远多于写的场景。
2. 写频繁或数组大时，复制成本、分配与旧数组保留会增加；慢迭代器可延长旧快照生命周期。
3. 快照保护集合结构，不给元素对象做深复制，也不保证读到最新加入项；元素自身可变状态仍需同步。

## 案例

1. 场景（教学示例）：在创建迭代器后添加新监听器，观察当前轮与下一轮读取是否相同。

2. 快照对照：创建迭代器后修改集合，旧迭代器保持自己的数组视图。

```java
var list = new java.util.concurrent.CopyOnWriteArrayList<Integer>();
list.add(1);
var before = list.iterator();
list.add(2);
before.forEachRemaining(System.out::println);
System.out.println(list);
```

3. 预期：旧迭代器仅输出 1，随后集合为 [1, 2]；另测高写入频率的分配量，并验证迭代器 remove 不受支持。

## 总结点

1. 迭代读的是创建时快照。
2. 复制结构不等于复制元素。
