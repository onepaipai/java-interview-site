<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Iterator.html)

</details>

## 参考回答

1. ArrayList 迭代删除用 Iterator.remove，每次删除应对应一次 next；增强 for 中直接删除会绕过迭代器协议。
2. 整批按条件删除可使用受支持的 removeIf；回调中不要再修改同一集合。
3. fail-fast 是尽力检测，漏报或没有异常均不证明并发安全；多线程读写仍需统一同步或合适并发容器。

## 案例

1. 场景（教学示例）：删除列表中的偶数，保留原有奇数顺序。

2. 核心代码。

```java
var values = new ArrayList<>(List.of(1,2,3,4));
for (var it=values.iterator();it.hasNext();) {
    if (it.next()%2==0) it.remove();
}
System.out.println(values);
```

3. 预期：[1, 3]；补测连续匹配、空列表和不支持 remove 的迭代器，不能依赖异常作为业务同步方案。

## 总结点

1. 迭代删除遵守迭代器协议。
2. fail-fast 不是并发锁。
