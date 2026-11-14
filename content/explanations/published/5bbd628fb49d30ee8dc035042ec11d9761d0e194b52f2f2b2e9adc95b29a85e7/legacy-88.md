<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. EnableAutoConfiguration 导入候选自动配置，按类路径、属性和 Bean 条件生效。
2. Boot 3 的自动配置候选使用 AutoConfiguration.imports，不照搬旧注册方式。
3. 检查条件报告，业务 Bean 可按条件覆盖默认配置，避免扩大扫描污染边界。

## 参考分析

1. 多实例同时启动会放大连接和 DDL 竞争。
2. 宽泛扫描可能污染业务 Bean，配置半更新会形成不一致规则。

## 案例

1. 场景（教学示例）：二十个副本同时启动并执行数据库迁移。
2. 处理：迁移放独立受控步骤，实例连接渐进建立；规则用带版本的不可变快照。

3. 验证：只有预定迁移执行者生效；失败配置不覆盖旧版本，启动不会冲垮数据库。

## 总结点

1. 装配不污染业务。
2. 迁移与扩容分开。
