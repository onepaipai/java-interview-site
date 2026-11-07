<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)
- [Spring Framework 6.2 参考 · 3](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 普通 new 只调用 Java 构造器，不会自动让对象经历 Spring 的依赖注入、生命周期和代理创建过程。
2. 事务等增强还需要启用相应基础设施、匹配的方法及经过代理的调用；把类标成 Service 不会改变任意 new 的语义。

## 参考分析

1. 字段注入依靠容器处理器执行，手工创建可能留下空字段；构造器显式传参只能解决依赖，不会附带事务代理。
2. 可由 @Bean 方法创建并交给容器管理；关键是对象是否进入管理及调用是否经过最终代理，不是源码有没有 new。

## 案例

1. 教学场景：控制器手工创建订单服务，字段仓储为空，补上传参后仍发现运行时异常没有回滚。

2. 让配置或扫描注册服务，再注入容器返回的引用；用真实事务管理器和隔离数据库执行插入后失败。

3. 验证服务异常后最终无新增行，并对照普通 new 路径；不要仅断言仓储方法被调用。

## 总结点

1. 手工创建不会自动受管。
2. 依赖存在不等于增强生效。
