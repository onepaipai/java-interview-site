<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. StackOverflowError 多见于递归无终止或调用深度过大。
2. 堆 OOM 可能是泄漏、真实容量不足或分配峰值过高。
3. 按异常区域取证，先修对象保留或递归问题，再评估 Xss 与 Xmx。

## 参考分析

1. 增加栈会提高单线程预算并降低可用线程数。
2. 内存不足可能来自泄漏、容量不足或突发大对象。

## 案例

1. 场景（教学示例）：序列化双向对象关系发生无限递归。
2. 处理：检查重复栈帧，打断对象环并设深度上限；堆问题另保留诊断快照。

3. 验证：深度超限返回可控错误；不以盲目增大 Xss 或 Xmx 掩盖循环。

## 总结点

1. 异常先分区域。
2. 递归先查退出条件。
