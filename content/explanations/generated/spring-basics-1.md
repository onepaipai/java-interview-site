<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html)

</details>

## 参考回答

1. IoC 把对象创建、组装与生命周期交给容器；DI 让业务通过明确契约接收依赖，减少在业务中选择实现和读取配置的代码。
2. 它降低创建与实现选择的耦合，不消除业务之间的依赖；接口边界和依赖方向仍需设计。

## 参考分析

1. 服务自己 new 支付实现时，切换实现常牵动业务代码；把选择移到装配配置后，业务只调用支付契约。
2. 容器能检查依赖是否可装配，但无法替你证明退款规则、失败恢复和外部系统可用性。

## 案例

1. 教学场景：OrderService 在方法内直接创建某个支付 SDK，单测也因此访问外部网络。

2. 改为构造器接收 PaymentPort，生产配置提供 SDK 适配器，单测提供固定结果的实现。

3. 验证成功、拒付两条业务分支都不需真实网络；另用装配测试确认生产配置选中所需实现。

## 总结点

1. 创建选择放在装配边界。
2. 业务耦合仍需明确设计。
