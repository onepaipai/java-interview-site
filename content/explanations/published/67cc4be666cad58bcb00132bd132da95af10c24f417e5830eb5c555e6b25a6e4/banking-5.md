<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 先查余额再无条件扣减会被并发请求穿透，造成负余额或超额使用。
2. 采用受控锁或条件更新，并明确可用余额的组成。

## 参考分析

1. 无锁预查得到的是过去观察值，并发者可能都通过。
2. 原子扣减条件要包含业务定义的可用额度，数量必须为正。

## 案例

1. 场景（教学示例）：余额 100，两笔 80 在同一时刻申请扣款。

2. 处理：短事务内条件更新可用余额并保存幂等结果，只有影响一行才写成功流水。

3. 验证：最多一笔成功，余额为 20；重复业务号不能再扣一次。

## 总结点

1. 校验与扣款同一原子边界。
2. 防超额还要防重复。
