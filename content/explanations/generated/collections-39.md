<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. 外层并发 Map 不自动保护内层集合；按同一业务键的创建、追加、删除及空集合回收应放在同一原子协调中。
2. 一种实现是 compute 内复制列表并发布不可变值；空列表返回 null 删除映射，避免先判断空再独立 remove 的竞态。
3. 调用方只读快照，不绕过协议修改旧值；大列表频繁复制代价高时可改用带独立生命周期协议的专用并发容器。

## 案例

1. 场景（教学示例）：用户 U 先关联 A、B，再逐项删除；删除最后一项时原子移除键。

2. 核心代码。

```java
var map = new java.util.concurrent.ConcurrentHashMap<String,List<String>>();
map.put("U",List.of("A","B"));
for (String value:List.of("A","B")) {
    map.computeIfPresent("U",(key,old)-> {
        var next = new ArrayList<>(old); next.remove(value);
        return next.isEmpty()?null:List.copyOf(next);
    });
    System.out.println(map.get("U"));
}
```

3. 预期：[B]、null；并发追加与末项删除需验证不会丢新值、形成脱离 Map 的孤立列表，或删除新创建的映射。

## 总结点

1. 内外两层都要定义并发边界。
2. 空值回收与更新原子协调。
