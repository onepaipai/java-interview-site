<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [github.com · 1](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/HashMap.java)

</details>

## 参考回答

1. OpenJDK 17 HashMap 用桶数组、链表和树桶；散列扰动后以 (n-1)&hash 定位，再比较哈希与 equals。
2. put 更新同键旧值或插入新节点，新增后超过负载阈值可触发扩容；长链还受树化阈值与最小表容量限制。
3. 容量取 2 的幂便于位掩码定位；扩容翻倍时可按旧容量那一位把桶拆到原位置或原位置加旧容量。
4. 它不提供并发安全；键比较字段应稳定，哈希冲突不代表键相等。

## 案例

1. 场景（教学示例）：同业务键的两个不同实例应更新同一映射，并观察 put 返回旧值。

2. 核心代码。

```java
record Key(long tenant,long account) {}
var map = new HashMap<Key,String>();
System.out.println(map.put(new Key(1,7),"old"));
System.out.println(map.put(new Key(1,7),"new"));
System.out.println(map.size()+" / "+map.get(new Key(1,7)));
```

3. 预期：null、old、1 / new；构造不同但同哈希的键时还需确认不会错误覆盖，扩容与树化按指定 JDK 的实际路径推导。

## 总结点

1. 掩码定位后仍需比较键。
2. 翻倍拆桶查看旧容量位。
