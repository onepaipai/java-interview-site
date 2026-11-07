<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Stripe 幂等请求 · 1](https://docs.stripe.com/api/idempotent_requests)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

</details>

## 参考回答

1. 前端禁用只改善体验，后端仍需稳定业务请求号与唯一约束。
2. 超时后允许查询原单，而非让用户反复新建提交。

## 参考分析

1. 前端禁按钮只改善体验，不能约束重发和多设备。
2. 服务端以稳定业务意图与唯一键保证重复请求收敛。

## 案例

1. 场景（教学示例）：用户连点、浏览器重试和 MQ 重投命中同一转账。

2. 处理：所有入口沿用同一业务号，核对参数并返回原状态，数据库唯一约束保护竞争首次请求。

3. 验证：只有一笔资金动作；处理中有查询入口，而不是让用户换号再点。

## 总结点

1. 按钮防抖不是业务幂等。
2. 各入口共用同一动作号。
