<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashSet.html)

</details>

## 参考回答

1. HashSet 以 HashMap 的键保存元素；先按 hashCode 定位，再以 equals 判重，哈希相同的不同元素可以共存。
2. equals 相等必须具有相同 hashCode；入表后修改参与比较和散列的字段，可能造成查找及去重异常。
3. Set 的去重规则应匹配完整业务身份，不能以哈希值本身或对象地址替代业务相等判断。

## 案例

1. 场景（教学示例）：两个相等业务键去重，不同但同哈希的键仍被保留。

2. 核心代码。

```java
record Key(int id) { public int hashCode() { return 0; } }
var set = new HashSet<Key>();
set.add(new Key(1)); set.add(new Key(1)); set.add(new Key(2));
System.out.println(set.size());
System.out.println(set.contains(new Key(2)));
```

3. 预期：2、true；再验证可变键的反例。使用不可变键可避免插入后字段变化破坏查找。

## 总结点

1. 同哈希不等于同元素。
2. 去重键入表后要稳定。
