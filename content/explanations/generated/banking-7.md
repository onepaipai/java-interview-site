<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 对同一组账户按稳定顺序获取锁，并在事务内维护余额及流水。
2. 跨系统时还需协调协议，不能靠本地锁覆盖全部路径。

## 参考分析

1. 反向转账容易构成 A 等 B、B 等 A 的锁环。
2. 统一顺序只降低常见死锁，仍需处理其他索引与约束导致的回滚。

## 案例

1. 场景（教学示例）：一笔 A→B、另一笔 B→A 并发转账。

2. 处理：两个事务都先锁较小账户号，再锁较大号，余额与流水同事务；死锁后整笔有界重试。

3. 验证：资金总额守恒；异常不留半笔转账，不宣称统一顺序消灭全部死锁。

## 总结点

1. 多账户按同序加锁。
2. 死锁重试完整事务。
