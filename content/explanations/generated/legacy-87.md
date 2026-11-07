<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

1. JDK 代理暴露接口契约，类代理通过生成子类增强可覆写方法；类代理受 final 类、final 和 private 方法等限制。
2. 默认代理模型中目标内 this 调用不重新进入代理；两种代理都可能如此，切换到类代理不能自动修复。

## 参考分析

1. JDK 代理不是实现类的子类，注入类型要匹配；目标实现方法 final 不等于接口代理调用必然不能增强。
2. 优先拆到另一受管 Bean，避免业务依赖 currentProxy 等环境细节；AspectJ 编织机制不同。

## 案例

1. 教学场景：外部调用 outer，内部 this.inner 标了独立事务，最终却随外层回滚。

2. 记录两类代理的拦截次数，拆出 inner Bean 后用真实事务数据库对照提交。

3. 验证内部独立规则只有经过相应边界才生效；已有外层事务不因自调用消失。

## 总结点

1. 接口契约与子类覆写分清。
2. 自调用绕过新的代理入口。
