<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.20.3)

</details>

## 参考回答

1. try-with-resources 按声明逆序关闭已初始化的资源，关闭失败也会继续关闭其余资源。
2. 已有主异常时，关闭异常加入 suppressed；没有主异常时，第一个关闭异常成为主异常。
3. 后续资源初始化失败时，已成功初始化的资源仍会被关闭。

## 参考分析

1. 异常抑制只保留主异常及附带失败，不能简单用最后一次关闭失败覆盖根因。
2. getCause 表示异常因果链，getSuppressed 表示同时发生但未成为主异常的附带失败。
3. 实现 AutoCloseable 的 close 应约定幂等及异常语义，不能假定任意资源都能重复关闭。

## 案例

1. 场景（教学示例）：按 A、B 顺序打开资源；正文抛 body，B 和 A 的 close 又分别抛 close-B、close-A。

2. 预期验证：调用方收到 body，getSuppressed 按 close-B、close-A 的顺序保留两个关闭异常。

3. 对照验证：正文不抛异常时，close-B 成为主异常，close-A 被抑制；B 初始化失败时只关闭已初始化的 A。

## 总结点

1. 先开后关，主异常优先。
2. 附带关闭错，看 suppressed。
