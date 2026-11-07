<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 弱键回收依赖可达性与 GC 时机，不具备稳定容量、TTL 和命中率控制。
2. 值反向引用键还可能破坏期望的回收行为。

## 案例

1. 场景（教学示例）：用 WeakHashMap 保存元数据，value 又包含对应 key 引用。

2. 处理：画出保留路径并去除不必要的反向引用；业务缓存明确设置容量与过期，不靠 GC 控制命中。

3. 验证：能解释反向引用为何保留键；不使用固定 sleep 断言 GC 必在某时回收。

## 总结点

1. 弱键不等于容量策略。
2. 值反向引用也会保留键。
