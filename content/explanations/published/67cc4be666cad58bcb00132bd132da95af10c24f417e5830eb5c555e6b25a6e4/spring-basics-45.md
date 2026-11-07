<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-methods/responsebody.html)

</details>

## 参考回答

1. 实体表达持久化结构，不是稳定的外部协议；直接返回可能暴露内部字段、关联、敏感数据并把表结构变化传播给客户端。
2. ORM 懒加载、双向关联和代理还可能造成额外查询、循环序列化或会话关闭错误；具体风险取决于所用持久层。

## 参考分析

1. 使用按用例设计的响应 DTO，只查询并返回被授权的字段，避免靠隐藏页面元素处理敏感信息。
2. DTO 还可以明确 ID、时间、枚举和空值协议；它不是放松服务端授权和数据库约束的理由。

## 案例

1. 教学场景：返回 User 实体后，新增 passwordHash 字段意外进入 JSON，订单关联又导致大量查询。

2. 改为明确的 UserProfile 响应与查询投影，列出允许字段，敏感字段不进入映射，并检查关联查询计划。

3. 验证响应契约无密码摘要等字段，权限边界成立，查询次数受控；实体新增字段不自动改变客户端响应。

## 总结点

1. 实体结构不等于接口契约。
2. 按用例明确响应字段。
