<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)

</details>

## 参考回答

1. 先区分增强未执行与增强执行但语义不同：自调用、普通 new、未启用设施等可能绕过代理；传播、异常规则和资源选择会改变最终结果。
2. 事务内吞异常、默认受检异常、不受管数据源及跨线程操作也可能与预期不符；不应一概归因于注解失效。

## 参考分析

1. Spring 6.2 类代理对部分非 public 方法有支持，接口代理另有限制；不能把旧版 public 口诀无条件套用。
2. final、private 方法的子类增强限制与 JDK 接口代理不同，需核对实际代理和调用路径。

## 案例

1. 教学场景：方法有注解但插入后异常仍留行，团队只反复改方法可见性。

2. 依次核对对象来源、代理、管理器、传播、异常是否穿出及线程，使用隔离库独立重读。

3. 验证每个对照有可解释结果，自调用可能仍在外层事务，受检异常可能按默认规则提交。

## 总结点

1. 按调用、规则和资源定位。
2. 以最终数据而非注解作证据。
