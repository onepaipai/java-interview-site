<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/testing/testcontext-framework/tx.html)

</details>

## 参考回答

1. 测试自动回滚会改变提交、提交后回调和约束触发时机，业务可能只是加入测试事务；线上没有相同边界时结果不同。
2. 关键用例需完成真实提交或回滚，再清理持久化上下文并从独立边界重读；数据仍使用隔离环境。

## 参考分析

1. ORM 缓存可能让同上下文读取看似成功，SQL 未 flush 时数据库约束也可能尚未执行。
2. 真实端口请求在另一线程，测试事务通常不能替请求回滚；不能以事务注解代替隔离和清理。

## 案例

1. 教学场景：同一 EntityManager 保存和查询成功，生产却在提交时报约束错误。

2. 明确 flush、提交与独立读取，增加回滚和提交事件路径，网络测试使用一次性数据库。

3. 验证提交阶段异常真正暴露，重读反映数据库状态，提交后监听按配置执行。

## 总结点

1. 测试会改变被测提交边界。
2. 提交后独立重读才是证据。
