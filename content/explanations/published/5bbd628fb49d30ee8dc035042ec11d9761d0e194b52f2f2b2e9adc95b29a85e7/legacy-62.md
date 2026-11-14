<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. JDK 7 主要按 Segment 分段，JDK 8 改用桶级 CAS、同步及协助扩容等机制。
2. size 使用并发计数策略，观测值不能用于精确跨键业务准入。
3. 单键原子更新用内建 API；值对象和跨键一致性另行保护。

## 参考分析

1. size 是并发观察值，不能用于精确容量准入。
2. 耗时映射函数会扩大竞争。
3. 不允许 null 使缺失语义清晰。

## 案例

1. 场景（教学示例）：同一用户并发累计多个事件。
2. 处理：把每键更新放入短小 compute，值使用不可变快照；远程请求在映射函数外处理。

3. 验证：并发计数不丢失；多个键之间的一致性仍需额外协议。

## 总结点

1. 单键原子不跨键。
2. Map 安全不保值安全。
