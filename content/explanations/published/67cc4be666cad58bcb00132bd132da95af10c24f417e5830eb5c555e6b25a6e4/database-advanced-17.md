<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl.html.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/metadata-locks.html.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：MySQL 8.4 / InnoDB 教学场景：ALTER TABLE 加了 ALGORITHM=INPLACE 仍造成线上抖动。拆解在线 DDL 的三个阻塞点：MDL 元数据锁、长事务拖尾与资源消耗，给出安全的 DDL 操作流程。

1. MDL 升级等待：DDL 需要排他元数据锁，获取前必须等所有打开该表的事务结束——一个 30 秒的长事务能让 DDL 排队，而 DDL 排队又会阻塞其后所有该表的读写（MDL 队列是公平但不插队的），抖动被放大成雪崩。
2. 执行期资源消耗：INPLACE 的多数算法仍要扫描全表构建（如加索引），IO、CPU、Buffer Pool 被占用；主从延迟随 DDL 时长放大。
3. 不可 INPLACE 的变更（改列类型、调整字符集）只能 COPY：整表重建加全程排他写入受限，耗时与风险都按表大小走——必须走 gh-ost/pt-osc 类外部工具或分步方案。

## 参考分析

### 机制：MDL 队列是"公平但不灵活"的闸门

元数据锁保证 DDL 期间没人看到半成品结构：DDL 到达后要等"当前所有事务"结束才能拿排他 MDL，而它排队期间，后来的普通读写也排在它后面。类比河道清淤：施工船（DDL）要等所有船只通过，而它封锁航道后，后续船只全部滞留——一颗长事务钉子，堵住整条河。

### 反例：30 秒长事务引发的 5 分钟不可用

一个报表事务 30 秒；DDL 在其后 1 秒到达并排队；这 30 秒内该表的全部读写（每秒数千）全部进入 MDL 等待队列——抖动远超事务本身。定界证据：performance_schema 的 metadata_locks 表显示 DDL 与长事务的等待链。修复：DDL 前 kill/等待长事务，并给 DDL 设置 lock_wait_timeout 快速失败。

### 取舍：INSTANT 算法的扩展与边界

ADD COLUMN（8.0+ 多数场景）、改列名等可 ALGORITHM=INSTANT——只改元数据、秒级完成；但 instant 有约束（列只能加在末尾的部分场景、与全文索引互斥等），且 Instant ADD COLUMN 之前的行仍按旧格式读取。执行前必须核对 "Online DDL 支持" 矩阵，ALGORITHM=INSTANT 显式声明——不匹配就快速失败，而不是默默降级为 COPY。

## 案例

### 对照操作：MDL 链的复现与守护

教学验证：开启长事务后发起 ALTER，再开第三个会话做普通 SELECT。预期：SELECT 因 MDL 跟随 DDL 排队，三条链在 metadata_locks 可见；提交长事务后链解开。把 lock_wait_timeout 与"DDL 前查长事务"写进操作流程，实验可复跑。

### 追问：为什么说"低峰执行 DDL"只对了一半

低峰解决资源消耗（第二点），但 MDL 链在任何时段都可能被一个偶发长事务触发（第一点）——低峰只是降低概率。完整的守护是：DDL 前检查 information_schema.innodb_trx、设置 lock_wait_timeout、用 gh-ost 类工具的锁续期机制兜底。概率措施与机制措施分开列。

## 总结点

1. MDL 是闸门，长事务是钉子
2. DDL 前查长事务，设超时快失败
3. 先核支持矩阵，再选算法
