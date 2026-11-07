<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/beans/factory/support/DefaultSingletonBeanRegistry.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html)

</details>

## 参考回答

1. 优先拆编排与依赖方向；早期引用机制只在允许且符合条件的单例创建中起作用，不能解决构造器环或任意 prototype 环。
2. 相关内部结构分别保存完整单例、已取得的早期引用和产生早期引用的工厂；工厂可按需取得含代理处理的引用，避免过早决定暴露原对象。

## 参考分析

1. 不能说三级缓存能解决所有循环；早期代理一致性、初始化状态和处理器能力都有约束，内部实现不等于稳定业务 API。
2. Boot 默认禁止循环引用；打开开关或使用 Lazy 可能只推迟问题，仍要检查依赖和真实代理行为。

## 案例

1. 教学场景：A、B 单例属性互引，A 还需事务代理，原始引用与最终代理可能不一致。

2. 优先提取单向编排；研究机制时用独立最小上下文记录早期引用和最终引用，不修改日常配置。

3. 验证修复后无环且事务失败正确回滚；构造器环明确失败，不能以允许循环开关宣称全部可解。

## 总结点

1. 工厂按需取得早期引用。
2. 循环治理优先修依赖结构。
