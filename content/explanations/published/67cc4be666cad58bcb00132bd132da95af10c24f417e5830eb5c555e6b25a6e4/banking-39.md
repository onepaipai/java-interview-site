<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 按业务可分割单元分批提交并保存进度，限制锁持有和日志规模。
2. 若必须整体原子，需要先论证容量和可行的业务边界。

## 参考分析

1. 长事务放大锁持有、undo、复制和恢复成本。
2. 分批要保持业务边界，不能把一笔必须原子的账务拆成半笔。

## 案例

1. 场景（教学示例）：批量处理十万笔独立交易。

2. 处理：按独立业务单小批提交，稳定游标与检查点记录位置，监控锁等待及最老批次。

3. 验证：内存和持锁时间受控；故障后只补未决交易，不为了批量效率破坏单笔原子性。

## 总结点

1. 缩短批次不拆原子业务。
2. 检查点配合幂等恢复。
