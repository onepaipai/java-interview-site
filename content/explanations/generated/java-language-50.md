<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 检查字节码目标、移除的 API、模块封装、依赖库和运行参数。
2. 先通过真实流量回放与灰度比较延迟、错误率和资源消耗。

## 参考分析

1. 能重新编译不代表旧 JAR 能直接运行。
2. 运行时、反射和默认行为的改变可能绕过编译检查。

## 案例

1. 场景（教学示例）：公共 SDK 修改返回类型并升级 JDK。
2. 处理：运行旧客户端字节码，检查 API 差异与关键业务回放，保留旧版本回退。

3. 验证：发现链接错误和行为差异后阻止发布；兼容策略有可验证证据。

## 总结点

1. 兼容分三层。
2. 旧客户端要实跑。
