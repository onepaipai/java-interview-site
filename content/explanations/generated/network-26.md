<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/package-summary.html)

</details>

## 参考回答

1. 通常是减少用户态与内核态之间的某些复制或上下文切换，不代表整个路径完全无复制。
2. 还需区分文件发送与加密处理场景。

## 案例

1. 场景（教学示例）：文件下载先 read 成字节数组再写 socket。

2. 处理：比较受支持的文件传输路径与普通流式实现，记录 CPU、分配和吞吐，确认 TLS 路径。

3. 验证：能够说明减少了哪一段复制；输出摘要一致，不宣称任何情况下都完全零复制。

## 总结点

1. 零拷贝需说明路径。
2. 加密条件单独验证。
