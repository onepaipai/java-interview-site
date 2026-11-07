<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)

</details>

## 参考回答

1. 远程调用等待可能延长数据库连接、锁和事务快照的持有时间，降低吞吐并放大超时故障。
2. 本地数据库事务也无法自动回滚已经成功的远程副作用；要按业务一致性要求设计状态机、幂等和恢复流程。

## 参考分析

1. 先扣库存再等支付结果，会让数据库资源跟着网络尾延迟等待；扩大连接池不能消除这类占用。
2. 可以短事务保存订单状态和待执行意图，再在事务外调用并核对结果；状态需表达处理中及失败，不能提前宣布支付成功。

## 案例

1. 教学场景：支付端响应很慢，数据库监控出现连接占满和锁等待，业务超时仍无法判断是否扣款。

2. 隔离环境把下单持久化和支付调用拆成可恢复步骤，支付使用稳定业务号并提供查询对账路径。

3. 验证远端超时后订单处于可解释状态，重试不重复扣款；比较连接占用和事务时长，不预设固定提升比例。

## 总结点

1. 本地事务不覆盖远程副作用。
2. 短事务配合幂等与恢复。
