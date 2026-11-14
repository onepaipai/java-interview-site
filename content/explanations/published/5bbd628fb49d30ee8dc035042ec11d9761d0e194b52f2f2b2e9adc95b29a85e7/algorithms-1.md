<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

1. 哈希表定位节点，双向链表维护访问顺序；get 命中和 put 更新都移到最近端。
2. 新键超过容量时淘汰最旧节点，同时删除映射；两个结构必须保持一一对应。
3. 哈希分布良好时 get、put 平均 O(1)，空间 O(capacity)；遍历链表找键会退化到 O(n)。
4. 并发时保护查找、移链和淘汰整个组合过程；get 也修改顺序，不能只给 put 加锁。

## 案例

1. 场景（教学示例）：容量为 2，依次放入 A、B，访问 A，再放入 C；应淘汰 B 而不是最早插入的 A。

2. 实现：手写哈希表加双向链表；头后为最近访问，尾前为最旧；本例只接收 String 键和 int 值，限单线程。

```java
class Lru {
    class Node {
        String key; int value; Node prev, next;
        Node(String key, int value) { this.key = key; this.value = value; }
    }
    final int limit;
    final java.util.Map<String, Node> map = new java.util.HashMap<>();
    final Node head = new Node(null, 0), tail = new Node(null, 0);
    Lru(int limit) {
        if (limit <= 0) throw new IllegalArgumentException("capacity");
        this.limit = limit; head.next = tail; tail.prev = head;
    }
    void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    void first(Node n) {
        n.next = head.next; n.prev = head;
        head.next.prev = n; head.next = n;
    }
    Integer get(String key) {
        Node n = map.get(key);
        if (n == null) return null;
        unlink(n); first(n); return n.value;
    }
    void put(String key, int value) {
        Node n = map.get(key);
        if (n != null) {
            n.value = value; unlink(n); first(n); return;
        }
        n = new Node(key, value); map.put(key, n); first(n);
        if (map.size() > limit) {
            Node old = tail.prev; unlink(old); map.remove(old.key);
        }
    }
}
var cache = new Lru(2);
cache.put("A", 1); cache.put("B", 2);
System.out.println(cache.get("A"));
cache.put("C", 3);
System.out.println(cache.get("B"));
System.out.println(cache.get("C"));
cache.put("A", 9);
System.out.println(cache.get("A") + " / " + cache.map.size());
```

3. 结果：输出 1、null、3、9 / 2；访问 A 后淘汰 B，更新 A 不增加元素数；缺失返回 null，与已存 int 值区分。

4. 验证：补测容量 1、重复更新、未命中、非法容量与尾部淘汰；用随机操作对照参考实现，逐步检查映射数等于链表节点数。

## 总结点

1. 哈希定位，双链排序。
2. 读命中也要刷新位置。
3. 淘汰同时删表和链。
