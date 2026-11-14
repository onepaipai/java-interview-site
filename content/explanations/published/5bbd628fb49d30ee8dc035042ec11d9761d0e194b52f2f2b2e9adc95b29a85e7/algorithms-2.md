<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

1. LFU 先淘汰访问频次最低的键；同频次按最近最少使用顺序淘汰。
2. 用键表、频次桶和 minFreq 定位候选；每个桶维护自己的 LRU 顺序。
3. 哈希表配合双向链表或有序集合，可使获取和淘汰达到平均 O(1)。

## 参考分析

1. 访问节点时从旧桶移除并加入新频次桶尾；最小频次桶变空时推进 minFreq。
2. 新键以频次 1 入桶并重置 minFreq；容量为 0 时直接拒绝存入。
3. 桶内顺序只在频次相同时裁决；不能用全局最近访问时间代替 LFU。

## 案例

1. 同频验证（教学示例）：容量 2，放入 A、B 后都为频次 1；再放 C，预期淘汰桶内更旧的 A。

2. 提频验证：重置后放 A、B，get A 两次、get B 一次；再放 C，预期淘汰频次较低的 B。

3. 关键伪代码：频次桶内的 removeOldest 和 appendNewest 均由 O(1) 链表操作实现。

```text
touch(node):
  old = node.freq
  buckets[old].remove(node)
  if old == minFreq and buckets[old].isEmpty():
    minFreq = old + 1
  node.freq = old + 1
  buckets[node.freq].appendNewest(node)

evict():
  victim = buckets[minFreq].removeOldest()
  nodes.remove(victim.key)
```

4. 边界验证：覆盖容量 0、更新旧键、最小桶清空；线程安全版本还要保护整组结构更新。

## 总结点

1. 先比频次，同频再比新旧。
2. 最小频次桶，桶内维护 LRU。
