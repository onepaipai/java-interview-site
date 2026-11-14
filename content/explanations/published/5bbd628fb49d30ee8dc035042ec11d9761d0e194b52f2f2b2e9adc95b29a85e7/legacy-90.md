<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. SqlSession 经 Executor、StatementHandler 等组件调用 JDBC 并映射结果。
2. 一级缓存围绕会话；二级缓存按 namespace 配置并有额外一致性成本。
3. 缓存受事务和其他写入口影响，懒加载需防 N+1 与会话外访问。

## 参考分析

1. 事务、SqlSession 生命周期及更新会影响缓存行为。
2. 多实例或其他程序写库时，进程缓存可能陈旧。
3. 懒加载易引发 N+1。

## 案例

1. 场景（教学示例）：两个实例查询后，由其中一个更新订单。
2. 处理：明确缓存失效边界，关键一致读关闭不适用缓存；列表查询一次批量取得所需字段。

3. 验证：另一实例不会无期限读旧值；SQL 次数与事务边界有集成测试。

## 总结点

1. 缓存服从写入边界。
2. 懒加载检查 SQL 次数。
