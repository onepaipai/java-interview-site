<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

1. 哈希表负责按键定位，双向链表维护遍历顺序；默认是插入序，accessOrder=true 才是访问序。
2. 访问序下成功 get、put 等会把对应条目移到最近端；新增条目后可用 removeEldestEntry 淘汰最久未访问项。
3. 它没有并发保护、TTL 或加载合并；访问序 get 也会修改结构，共享读写需要统一同步。

## 案例

1. 场景（教学示例）：容量为 2 的缓存先写 A、B，命中 A 后再写 C。

2. 核心代码。

```java
class Lru<K,V> extends java.util.LinkedHashMap<K,V> {
    Lru() { super(16, 0.75f, true); }
    protected boolean removeEldestEntry(java.util.Map.Entry<K,V> eldest) {
        return size() > 2;
    }
}
var cache = new Lru<String,Integer>();
cache.put("A", 1); cache.put("B", 2);
cache.get("A");
cache.put("C", 3);
System.out.println(cache.keySet());
```

3. 预期：[A, C]，B 被淘汰；改为插入序时预期留下 B、C。该例没有实现并发和过期策略。

## 总结点

1. 访问序才按最近使用排序。
2. get 也可能修改链表。
