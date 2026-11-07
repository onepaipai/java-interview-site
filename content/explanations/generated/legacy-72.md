<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. 线程池复用线程，ThreadLocal 值可越过请求生命周期。
2. 提交时捕获必要上下文，运行时设置，finally 清理或恢复。
3. InheritableThreadLocal 继承发生在线程创建时，不保证每次任务上下文正确。

## 参考分析

1. 弱键不能自动释放仍被线程持有的值。
2. InheritableThreadLocal 在创建子线程时继承，不能正确覆盖每次线程池任务。

## 案例

1. 场景（教学示例）：同一工作线程先处理租户 A 再处理 B。
2. 处理：任务装饰器显式设置租户和 MDC，finally 清理并恢复提交前上下文。

3. 验证：B 的日志和查询不出现 A 的身份；异常和取消路径也清理。

## 总结点

1. 上下文按任务传。
2. 复用线程必清理。
