<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. 并发 Map 保护映射操作及发布边界，不替值对象的 ArrayList、计数器等内部状态加锁。
2. 可用不可变值并在 compute 内整体替换，也可使用有明确并发语义的值；跨键不变量仍需额外协调。
3. 不能从 Map 取出可变值后绕过协议直接改字段；值被删除、替换后的旧引用仍可能继续被调用方持有。

## 案例

1. 场景（教学示例）：同一用户的标签以不可变列表保存，每次追加都在单键原子更新内生成新值。

2. 核心代码。

```java
var map = new java.util.concurrent.ConcurrentHashMap<String,List<String>>();
map.put("U",List.of("A"));
var old = map.get("U");
map.compute("U",(key,current)-> {
    var next = new ArrayList<>(current); next.add("B"); return List.copyOf(next);
});
System.out.println(old);
System.out.println(map.get("U"));
```

3. 预期：[A]、[A, B]；旧快照稳定，所有写入仍需遵循同一 compute 协议。本例不承诺跨用户的整体快照。

## 总结点

1. 容器只保护映射边界。
2. 不可变值按键整体替换。
