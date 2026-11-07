<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/classpath-scanning.html)

</details>

## 参考回答

1. Component 是通用组件标记，Service、Repository、Controller 是带角色含义的派生组件，帮助表达业务、持久化和 Web 边界。
2. Repository 在相应异常转换基础设施下可参与持久化异常转换；Controller 与请求映射等机制配合处理 Web 请求，不能仅凭注解名推断所有功能。

## 参考分析

1. Service 不会自动开启事务，仍需事务配置和代理调用；Repository 也不会把任意数据访问代码自动变成事务。
2. RestController 组合 Controller 与 ResponseBody 语义；扫描范围、条件和 Bean 是否注册仍需确认。

## 案例

1. 教学场景：服务类改成 Service 后认为异常会自动回滚，实际事务管理未启用。

2. 按职责保留角色注解，分别验证扫描注册、Controller 映射和事务代理；数据库异常转换按所用技术测试。

3. 预期角色清晰且每项行为有对应配置与证据；单纯替换注解不能作为回滚或请求路由已生效的证明。

## 总结点

1. 派生注解表达组件角色。
2. 额外行为依赖对应基础设施。
