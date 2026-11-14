<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)

</details>

## 参考回答

1. ArrayList 等普通集合通过修改计数尽力检测迭代期间的结构变化；set 替换与增加删除的性质不同。
2. 单线程遍历删除遵守 Iterator.remove 协议，或使用受支持的 removeIf；并非每一种迭代器都支持删除。
3. fail-fast 不保证发现所有并发修改；跨线程仍要建立统一锁、快照或符合语义的并发容器协议。

## 案例

1. 场景（教学示例）：使用迭代器删除连续两项，验证不会跳过相邻匹配元素。

2. 核心代码。

```java
var values = new ArrayList<>(List.of(1,2,2,3));
for (var it=values.iterator();it.hasNext();) if (it.next()==2) it.remove();
System.out.println(values);
```

3. 预期：[1, 3]；对比下标循环删除易漏相邻元素的错误写法。不要把没有 ConcurrentModificationException 当作线程安全证据。

## 总结点

1. 连续删除也要遵守迭代协议。
2. 异常检测不能代替同步。
