<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. final 约束继承、重写或赋值；final 引用不等于对象深不可变。
2. finally 通常用于退出清理，不应 return 或覆盖主异常。
3. finalize 不保证及时执行，资源应显式 close 或用 try-with-resources。

## 参考分析

1. 资源关闭异常保存在 suppressed 中。
2. finally 的 return 或 throw 会掩盖主流程结果。
3. finalize 不用于可靠释放。

## 案例

1. 场景（教学示例）：读取文件失败且关闭资源也失败。
2. 处理：保留读取异常为主异常，排障时同时检查 suppressed，资源使用 AutoCloseable。

3. 验证：调用方收到根因，关闭失败可追踪；失败路径也释放资源。

## 总结点

1. 主异常别覆盖。
2. 资源及时关闭。
