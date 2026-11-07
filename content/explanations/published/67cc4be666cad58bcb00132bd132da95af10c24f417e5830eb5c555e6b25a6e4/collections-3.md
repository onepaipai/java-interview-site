<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

1. 先核对键的 hashCode 分布、桶中碰撞和热点调用栈，区分哈希分布差、键频繁变化与单个热键。
2. 不同键哈希相同仍需 equals 区分；排查是否用固定哈希、低区分度字段或无边界的外部输入。
3. 修复键设计并限制输入规模，再评估容量和树化；树化不能消除热点，也不保证任意恶劣键都具有理想查找成本。

## 案例

1. 场景（教学示例）：三个不同业务键故意返回相同哈希，观察是否覆盖彼此。

2. 核心代码。

```java
record Key(int id) { public int hashCode() { return 0; } }
var map = new HashMap<Key,Integer>();
for (int i=0;i<3;i++) map.put(new Key(i),i);
System.out.println(map.size());
System.out.println(map.get(new Key(2)));
```

3. 预期：3、2；碰撞不等于重复键。治理前后比较相同规模下的 equals 调用、热点栈和延迟，不能仅凭 size 判断无性能问题。

## 总结点

1. 碰撞用 equals 继续区分。
2. 先治键分布再调容量。
