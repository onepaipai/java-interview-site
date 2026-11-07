<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [github.com · 1](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/HashMap.java)

</details>

## 参考回答

1. OpenJDK 17 的树化阈值为 8，但还要求桶数组容量至少为 64；小表遇长链通常先扩容。
2. 阈值检查位置与插入路径有关，不能一概背成“放第 8 个必树化”；普通 put 在已有 8 节点后继续追加会触发检查。
3. 这是实现细节，更新已有键不增加链长；解释时同时给 JDK、插入方法、桶长度及数组容量。

## 案例

1. 场景（教学示例）：固定容量参数 64，使用同哈希的不同键，通过普通 put 逐个插入。

2. 核心代码。

```java
record Key(int id) { public int hashCode() { return 0; } }
var map = new HashMap<Key,Integer>(64);
for (int i=0;i<8;i++) map.put(new Key(i),i);
System.out.println(map.entrySet().iterator().next().getClass().getSimpleName());
map.put(new Key(8),8);
System.out.println(map.entrySet().iterator().next().getClass().getSimpleName());
```

3. OpenJDK 17 预期：Node、TreeNode；把初始容量改成 16 后第 9 次插入先扩容，不能据阈值数字断言已经树化。

## 总结点

1. 树化同时看桶长与表容量。
2. 精确触发要看插入路径。
