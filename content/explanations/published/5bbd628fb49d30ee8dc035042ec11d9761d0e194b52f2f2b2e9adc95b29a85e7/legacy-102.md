<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 DBA 沙盘:2 亿行大表加索引——MySQL 8.0 Online DDL(ALGORITHM=INPLACE, LOCK=NONE)+gh-ost(触发器替代,可控暂停)+pt-online-schema-change——三种方案的选择与风险。

1. Online DDL(MySQL 8.0):INPLACE(不重建表,索引直接在原表上构建)+LOCK=NONE(允许并发 DML)——大多数 ADD INDEX/ADD COLUMN 支持 INPLACE;例外:改列类型/缩短列长度=需要 COPY(锁表)——先查 ALGORITHM 支持矩阵。
2. gh-ost:Ghost(影子表+binlog 同步+原子切换)——不使用触发器(pt-osc 用触发器有性能开销)→解析 binlog 同步变更;可暂停/限速/切换控制——大表(亿级)推荐 gh-ost(可控性最好)。
3. pt-online-schema-change:触发器同步(原表触发器→影子表)+rename 原子切换——触发器开销(每行写两份)+锁风险;gh-ost 的优势=无触发器(用 binlog)+可限速(保护主库)。

## 参考分析

### 机制:Online DDL 的"并行"原理

ADD INDEX 的 INPLACE:构建临时索引文件→同时应用 DML 变更(online log)→合并(重建索引末尾应用 DML log)——DML 与 DDL 并行(InnoDB 的 online log 保证不丢);MDL 锁(Metadata Lock)在 DDL 开始与结束时短暂获取(如果长事务持 MDL→DDL 等待→后续所有查询阻塞——DDL 前查长事务)。

### 反例:DDL 的两种事故

事故一:长事务阻塞 DDL——DDL 需要 MDL 排他锁→长事务持有 MDL 共享锁→DDL 等待→后续所有查询排在 DDL 后面(全库阻塞);修复=DDL 前检查长事务(information_schema.innodb_trx)+设 lock_wait_timeout(超时放弃)。事故二:DDL 大事务产生的 binlog 回放慢——从库回放 DDL 的时间=主库执行时间(大表 DDL 从库延迟飙升,第 100 题);修复=gh-ost 的可控限速+从库延迟监控。

### 取舍:三种方案的选择

Online DDL:MySQL 原生+简单(DDL 语句直接跑)+风险=MDL 锁+不可暂停;gh-ost:可控(暂停/限速/切换)+无触发器+风险=额外存储+延迟(通过 binlog 同步);pt-osc:成熟工具+触发器开销+大表性能差——按表大小(千万以下 Online DDL,亿级 gh-ost)+可控性需求选。

## 案例

### 验证:DDL 的走查核对

验证:Online DDL 断言(ALGORITHM=INPLACE 成功+DML 并行执行不阻塞);gh-ost 断言(限速生效/暂停/切换原子);MDL 风险断言(长事务+DDL→后续查询阻塞——复现并预防);从库延迟断言(DDL 期间从库延迟+gh-ost 限速后缓解)。验证:DDL 的断言可在测试环境复现(生产 DBA 评审执行)。

### 追问链:DDL 三刀

一刀:"DDL 的 ALGORITHM 有哪些?"——COPY(重建表,锁表)/INPLACE(原表修改,不锁)/INSTANT(仅元数据,秒级——ADD COLUMN MySQL 8.0.12+)——优先 INSTANT>INPLACE>COPY(ALGORITHM=INPLACE 显式声明,不支持则报错不静默降级)。二刀:"列类型变更的风险?"——改列类型可能需要 COPY(锁表)+数据截断风险(长度缩小)+索引重建——类型变更=最高风险 DDL,需 DBA 评审+备份+回滚方案。三刀:"DDL 的回滚?"——Online DDL 的回滚=执行反向 DDL(加的索引删掉)+耗时(与正向相同);gh-ost 的回滚=切回原表(秒级)——gh-ost 的回滚更可控(大表场景)。

## 总结点

1. Online DDL:INPLACE+LOCK=NONE
2. gh-ost=无触发器+可控暂停+限速
3. DDL 前查长事务,防 MDL 阻塞
