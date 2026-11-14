<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 先查对象是否受容器管理以及调用是否经过代理。
2. 再查异常回滚规则、传播、数据源和事务管理器；捕获异常会影响结果。
3. 方法可见性依代理与 Spring 版本判断，异步线程不自动继承调用方事务。

## 参考分析

1. 外层已有事务时，内层可能参与外层而掩盖自调用问题。
2. 测试须明确外层无事务和异常条件。

## 案例

1. 场景（教学示例）：非事务方法直接调用同类事务方法，第二次插入失败。
2. 处理：拆分到独立写服务，通过注入的代理调用；保留数据库回滚断言。

3. 验证：两次写入都回滚；同样检查缓存与异步注解是否真正经过代理。

## 总结点

1. 同类调用绕代理。
2. 验证要看真实提交。
