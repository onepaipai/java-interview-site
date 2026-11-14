<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 强引用阻止回收；软引用按内存需要清理，不宜作为精确缓存策略。
2. 弱引用不阻止对象在相应回收处理中被清理。
3. 虚引用配合引用队列观测回收阶段，不能通过 get 取回对象。

## 参考分析

1. 仍从 GC Roots 可达的无用对象也会泄漏。
2. finalize 不可靠，Cleaner 只能作为兜底，不能替代确定性关闭。

## 案例

1. 场景（教学示例）：静态监听器集合保留已下线租户对象。
2. 处理：从堆保留路径找到静态集合，取消注册并建立容量上限，资源用 close 管理。

3. 验证：下线后引用路径断开；多轮 GC 后趋势下降，不能以一次快照判定泄漏。

## 总结点

1. 无用仍可达也泄漏。
2. 资源别等 GC。
