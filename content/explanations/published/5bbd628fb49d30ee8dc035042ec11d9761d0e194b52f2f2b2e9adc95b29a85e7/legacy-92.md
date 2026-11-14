<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 拆分自动配置与依赖聚合，Boot 3 用 imports 注册候选。
2. 按类路径和已有 Bean 条件启用，配置属性类型化并校验。
3. 提供业务覆盖、最小上下文与版本兼容测试，避免宽泛组件扫描。

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
