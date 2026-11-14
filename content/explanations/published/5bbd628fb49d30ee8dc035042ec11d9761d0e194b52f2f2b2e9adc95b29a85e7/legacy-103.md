<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银核心沙盘:转账的隔离级别=REPEATABLE READ(InnoDB 默认)+SELECT FOR UPDATE(悲观锁锁定账户行)——隔离级别的选择=一致性与并发吞吐的权衡(banking 场景的一致性优先)。

1. 转账的隔离级别:REPEATABLE READ(InnoDB 默认)——快照读(MVCC)+当前读(FOR UPDATE 的 next-key 锁)防幻读;READ COMMITTED:并发更好(无间隙锁)但不可重复读(两次读可能不同)——转账的一致性要求=RR(余额不变式:扣款与入账在同一事务的同一快照)。
2. SELECT FOR UPDATE:悲观锁(锁定 SELECT 的行,其他事务阻塞)——用法:BEGIN→SELECT FOR UPDATE(锁定账户行)→检查余额→UPDATE→COMMIT——FOR UPDATE 必须在事务内(否则锁立即释放无意义);条件=WHERE id=?(精确匹配,不走索引则锁全表)。
3. 替代:条件 UPDATE(SET balance=balance-? WHERE id=? AND balance>=?——检查与扣减合一,原子);乐观锁(版本号条件 UPDATE,冲突重试,第 122 题)——FOR UPDATE 适合先查后判,条件 UPDATE 适合直接扣减。

## 参考分析

### 机制:FOR UPDATE 与条件 UPDATE 的选择

FOR UPDATE=先读后写(需要读取数据做业务判断——如检查账户状态/风控规则);条件 UPDATE=直接写(扣减逻辑简单——余额足够即扣)——条件 UPDATE 更高效(单条语句原子,无额外锁持有时间);FOR UPDATE 更灵活(读取后复杂判断)——按"业务逻辑的复杂度"选。

### 反例:转账事务的两种事故

事故一:FOR UPDATE 不走索引——WHERE 无索引列→锁全表扫描的所有行(锁升级为表级效果);修复=WHERE 条件走索引(主键/唯一索引)。事故二:事务中夹远程调用——FOR UPDATE 锁住账户行→调用外部接口(2s)→锁持有 2s→并发排队雪崩(第 10 题分布式事务的阻塞窗口);修复=远程调用移出事务。

### 取舍:RR vs RC 在转账场景的选择

RR(默认):一致性读稳定+next-key 锁防幻读——但间隙锁增加死锁风险(第 96 题);RC:并发好(无间隙锁)但不可重复读——转账场景的一致性要求=RR(余额在同一事务内不变);互联网公司用 RC(阿里规范)+条件 UPDATE(避免 FOR UPDATE 的间隙锁)——选择=一致性等级(金融 RR)vs并发(RC)。

## 案例

### 验证:转账事务的走查核对

验证:FOR UPDATE 断言(锁定后其他事务 SELECT 阻塞→UPDATE 提交后释放);条件 UPDATE 断言(余额不足→受影响行数=0);隔离级别断言(RR 下两次读一致/RC 下可读新值);并发扣减断言(500 并发→条件 UPDATE 零超卖,第 122 题实测)。验证:database-basics 22/26 题的锁行为+banking 7 题锁序实验可复用。

### 追问链:转账三刀

一刀:"转账的幂等?"——唯一流水号+唯一索引(第 119 题)+状态机(处理中→成功/失败——条件迁移)——幂等是转账的底线(重复请求不重复扣款)。二刀:"跨行转账的一致性?"——跨行=外部系统(人行/银联)→无法用数据库事务(第 120 题)——本地事务(扣款)+outbox+渠道确认+对账(第 120/123 题)——跨行一致性=最终一致+对账兜底。三刀:"转账的风控?"——实时限额(第 126 题规则引擎)+行为风控(新收款人+大额→增强验证)+延时到账(大额 24h 可撤销,第 159 题转账系统)。

## 总结点

1. 转账=RR+FOR UPDATE 或条件 UPDATE
2. FOR UPDATE 必须在事务内+走索引
3. 远程调用移出事务,不持锁等待
