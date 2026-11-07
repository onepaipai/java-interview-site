<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Stripe 幂等请求 · 1](https://docs.stripe.com/api/idempotent_requests)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

</details>

## 参考回答

1. 批次与明细分别建模，每条有稳定业务键和独立状态，汇总由明细事实推导。
2. 重跑只处理允许重试项，防止已成功项重复支付。

## 参考分析

1. 批次总体状态与每笔明细结果要分别保存。
2. 重跑只推进未决明细，不能因整批失败重做已成功付款。

## 案例

1. 场景（教学示例）：一万笔代发中前五千笔成功，任务随后退出。

2. 处理：每笔固定业务号和结果，恢复先查未知项；按明细分类汇总批次，限制恢复并发。

3. 验证：已成功项不重复付款，失败项可重试；批次能准确展示部分成功。

## 总结点

1. 明细状态决定重跑。
2. 整批重试不能重付成功项。
