<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 文件、HTTP 与数据库边界显式指定编码，不依赖操作系统默认值。
2. 对无法解码的输入定义拒绝或替换策略，保留原始错误证据。

## 参考分析

1. readAllBytes 需要容纳整份文件及后续副本。
2. 关闭职责不清会泄漏句柄，过早关闭又会破坏调用方。

## 案例

1. 场景（教学示例）：导入一个超过堆容量的文件。
2. 处理：限制文件大小，按行解析和批次提交，用 try-with-resources 关闭输入。

3. 验证：内存随批次而非文件增长；中断后关闭资源且记录恢复位置。

## 总结点

1. 大文件分批读。
2. 资源谁建谁管。
