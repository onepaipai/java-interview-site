<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html)

</details>

## 参考回答

1. 从业务目标、边界、不变式和失败恢复评估收益与成本，确认方案解决了具体问题。
2. 检查数据归属、依赖方向、授权、事务、兼容与迁移；新增框架和注解数量不能代替收益证据。

## 参考分析

1. 选关键用例画正常和失败链路，讨论超时、部分提交与重试，比只看分层图更能发现问题。
2. 性能用基线和代表负载验证，迁移需分步、回退和观察指标，并考虑下游预算。

## 案例

1. 教学场景：拟把下单拆成多个服务，理由只是服务化先进，却没定义跨库失败。

2. 列出必须原子的规则与一致窗口，对比模块内重构和远程拆分成本，设计小范围迁移。

3. 验证失败可恢复、旧客户端可用、收益有证据、回退可执行，不把教学假设写成生产提升。

## 总结点

1. 收益对应具体业务目标。
2. 迁移与恢复也是方案组成。
