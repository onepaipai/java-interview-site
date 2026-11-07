<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

1. 区分尝试审计与成功审计：尝试可在失败时保留，成功必须对应已提交事实，不能在提交前宣称完成。
2. 成功审计可与业务同事务持久化，再可靠转发；独立事务审计要明确可能在业务回滚后仍存在。

## 参考分析

1. 日志输出无法保证与数据库原子一致，也可能丢失或采样；载荷最小化并受访问控制。
2. 异常和补偿用稳定业务标识关联，禁止记录密码或完整令牌；不可篡改要求还需独立机制。

## 案例

1. 教学场景：订单写入后打印 success，随后事务回滚，审计平台却显示成交。

2. 成功意图纳入业务提交，尝试记录标明失败或未决，转发按事件键去重。

3. 验证提交、回滚、投递失败与重复投递各有正确状态，追踪字段不泄露秘密。

## 总结点

1. 尝试与成功审计分开。
2. 成功事实对应提交边界。
