<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/IdentityHashMap.html)

</details>

## 参考回答

1. IdentityHashMap 用引用身份而非 equals 比较键；字段相同的两个实例仍是两个不同键。
2. 适合对象图遍历、复制及实例身份跟踪；按业务编号、字符串内容聚合时通常不符合预期。
3. 它不是弱引用容器，也不按 GC 自动淘汰键；容量和生命周期仍由调用方负责。

## 案例

1. 场景（教学示例）：两个不同 String 实例都包含 A，业务上应指向同一条账户记录。

2. 核心对照：身份 Map 保留两个实例，普通 Map 按字符串值合并。

```java
var a = new String("A");
var b = new String("A");
var identity = new java.util.IdentityHashMap<String, Integer>();
identity.put(a, 1); identity.put(b, 2);
var values = new java.util.HashMap<String, Integer>();
values.put(a, 1); values.put(b, 2);
System.out.println(identity.size() + " / " + values.size());
```

3. 预期：2 / 1；对象图中需区分同值节点时前者合理，业务键去重时前者会产生重复。不要混入 WeakHashMap 的弱键清理结论。

## 总结点

1. 身份相同必须是同一个实例。
2. 身份 Map 不承担弱键淘汰。
