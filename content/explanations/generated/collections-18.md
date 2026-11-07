<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. ConcurrentHashMap 的约定禁止 null 键和值，get 返回 null 可明确表示本次读取没有映射。
2. 若允许 null 值，先 get 再 containsKey 仍无法在并发修改下原子地区分“空值”和“不存在”。
3. 业务空结果用 Optional、哨兵或显式状态包装；缓存空结果还需定义过期与失效策略，不能把 null 当成已缓存。

## 案例

1. 场景（教学示例）：需要区分“没有缓存”和“查过但无结果”。

2. 核心代码。

```java
var values = new java.util.concurrent.ConcurrentHashMap<String,String>();
try { values.put(null, "A"); }
catch (NullPointerException expected) { System.out.println("null-key rejected"); }
try { values.put("A", null); }
catch (NullPointerException expected) { System.out.println("null-value rejected"); }
System.out.println(values.get("missing"));
var cache = new java.util.concurrent.ConcurrentHashMap<String,java.util.Optional<String>>();
cache.put("missing", java.util.Optional.empty());
System.out.println(cache.containsKey("missing") + " / " + cache.get("missing").isEmpty());
```

3. 预期：两次 null 写入被拒绝、未命中读到 null、包装后的空结果输出 true / true；两次观察只用于本例静态状态展示。

## 总结点

1. null 代表本次读取无映射。
2. 空结果用显式状态表达。
