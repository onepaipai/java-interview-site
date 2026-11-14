<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 单例循环处理中一级放完整对象，二级放早期引用，三级放早期引用工厂。
2. 工厂允许在需要时获得可能增强的引用，但不是所有代理场景都可解决。
3. 构造器循环和 prototype 循环不靠此机制解决，优先改依赖方向。

## 参考分析

1. 三级缓存是特定单例循环处理机制，不是所有注入形态的保证。
2. 代理未完成时不可依赖增强逻辑。

## 案例

1. 场景（教学示例）：BeanPostProcessor 构造器依赖业务服务，服务未获代理。
2. 处理：缩小后处理器依赖，必要时延迟获取，提取单向策略注册入口。

3. 验证：启动无提前创建警告；事务与切面用真实代理测试。

## 总结点

1. 早期对象慎依赖。
2. 循环靠结构化解。
