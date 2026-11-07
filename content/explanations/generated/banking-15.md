<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [TigerBeetle 事务状态 · 2](https://docs.tigerbeetle.com/coding/two-phase-transfers/)

</details>

## 参考回答

1. 将可退额度检查与累计占用原子更新，退款记录有唯一业务键。
2. 处理中退款也需占用额度，并通过查询释放失败占用。

## 参考分析

1. 可退额度须扣除已成功和处理中退款占用。
2. 未知退款不能提前释放，否则迟到成功可能造成超退。

## 案例

1. 场景（教学示例）：原单 100，两笔各退 80 同时申请。

2. 处理：原子占用可退额度并保存退款记录；结果确定失败再按版本释放，成功转为已退。

3. 验证：只允许一笔 80 占用；重复请求不多占，累计成功加在途不超过 100。

## 总结点

1. 处理中退款也占额度。
2. 释放必须有确定依据。
