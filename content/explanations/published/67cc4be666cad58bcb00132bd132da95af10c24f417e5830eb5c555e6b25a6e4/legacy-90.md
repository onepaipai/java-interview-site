<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [mybatis.org · 1](https://mybatis.org/mybatis-3/java-api.html)
- [mybatis.org · 2](https://mybatis.org/mybatis-3/sqlmap-xml.html)
- [mybatis.org · 3](https://mybatis.org/spring/transactions.html)

</details>

## 参考回答

1. 通常由 Mapper 代理或 SqlSession 调到 Executor，经过语句、参数处理与 JDBC 执行，再映射结果；插件与执行器类型会影响细节。
2. 一级缓存通常属于 SqlSession，受配置及更新清理影响；二级缓存需要显式配置，按 namespace 组织并有提交可见性规则。
3. 懒加载将关联查询延后到访问时，需关注会话生命周期、N+1 与序列化触发；Spring 集成中的会话使用按其事务设施确认。

## 参考分析

1. 二级缓存不天然解决多实例、跨 namespace 更新和外部写库失效；是否使用要结合一致性要求。
2. 同一会话重复读得到同值不能证明数据库已提交，接口返回前应明确查询投影而非任意触发懒加载。

## 案例

1. 教学场景：Mapper 第一次查询后同会话再次查询未访问数据库，换会话后结果取决于二级缓存设置和提交。

2. 记录真实 SQL，测试更新、提交、回滚与不同 namespace，再让序列化访问关联观察额外查询。

3. 验证缓存范围和失效符合配置，批量列表无无界 N+1；不把本地缓存命中当跨节点强一致。

## 总结点

1. 执行链与缓存作用域分清。
2. 懒加载可能变成额外查询。
