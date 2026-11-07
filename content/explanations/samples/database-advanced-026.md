# 库存扣减怎样避免先查后改的超卖？

<!-- source: senior-v1/database-advanced/26 -->

MySQL 8.4 / InnoDB · [写入锁](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html) · [锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html) · [死锁处理](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html)

## 参考回答

1. 库存条件和扣减放在同一条 UPDATE，检查影响行数；quantity 必须为正。
2. request_id 唯一的扣减记录与库存更新放进同一事务，重复请求不再次执行扣减。
3. 失败回滚整笔事务；提交后响应丢失时沿用原 request_id 查结果并核对参数。

## 参考分析

1. 先查后改可能让两个请求同时卖出最后一件，库存最终非负也不能证明没有超卖。
2. 条件 UPDATE 处理不同请求的并发争抢，唯一请求记录处理同一请求重放，不能相互替代。
3. 重复键异常先结束本次事务，再查已有已提交记录；相同标识携带不同 SKU 或数量应拒绝。

## 案例

1. 场景（教学示例）：stock.sku_id 为主键，stock_deduction.request_id 唯一；库存 1，两个请求各买 1。

2. 事务内先插扣减记录，再做条件 UPDATE；以下是框架绑定的具名参数 SQL，quantity 在进入前校验为正。

```sql
INSERT INTO stock_deduction(request_id, sku_id, quantity)
VALUES (:requestId, :skuId, :quantity);

UPDATE stock
SET available = available - :quantity
WHERE sku_id = :skuId AND available >= :quantity;
```

3. 判定：UPDATE 影响 1 行才提交；影响 0 行或后续业务写入失败，库存和扣减记录一起回滚。

4. 重试：唯一键冲突后结束本次事务，另查原记录；SKU 和数量相同返回既有结果，不同则拒绝。

5. 预期验证：两个不同请求仅一笔成功、库存 0；同请求重放不多扣，失败方无已提交扣减记录。

6. 边界：真实 MySQL 另测锁等待、回滚和整笔死锁重试；现有 H2 演示只覆盖条件更新竞争。

## 总结点

1. 并发靠条件，重放靠唯一键。
2. 记录与扣减，同成同败。
3. 超时不判失败，沿原请求查结果。
