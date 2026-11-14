<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/delete.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/truncate-table.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银数据清理沙盘:清空日志表用 truncate(快)删部分用 delete(可回滚)删表结构用 drop——三者的 DML/DDL 属性与回滚能力差异。

1. delete:DML——逐行删除(逐行记 undo/binlog)可 where 过滤可回滚;触发触发器;自增不清零;速度慢(大表删除锁行+日志量大);空间不立即回收(碎片,需 optimize/重建回收)。
2. truncate:DDL——整表重建(删除数据页重新初始化)不可 where 不可回滚(MySQL 8.0 前 DDL 无原子性,8.0 后原子 DDL 但仍不可回滚到事务);速度快(不逐行);自增复位;触发器不触发;binlog 记为语句(主从一致依赖 row 格式细节)。
3. drop:DDL——连表带结构删除(索引/权限/触发器全删);不可回滚(8.0 原子 DDL 保证“要么删成要么没删”但删成就是没了);释放空间;恢复只能靠备份/回收站(如部署了回收站机制)。

## 参考分析

### 机制:为什么 truncate 快且不可回滚

delete 按行维护 undo(每行可逆)——代价是日志量与锁;truncate 直接重置表空间(页级别操作,无逐行 undo)——没有“回到中间态”的路径=不可回滚;DDL 隐式提交(事务里执行 delete 后 truncate,前半段也被提交——第 42 题事故同源)。

### 反例:三种删除的事故

事故一:生产手滑 truncate 大业务表——不可回滚只能 PITR 恢复(第 151 题备份演练);修复=高危 SQL 工单+权限隔离(drop/truncate 只 DBA)。事故二:大表 delete 清理历史——一次删 5000 万行→长事务+undo 膨胀+主从延迟;修复=分批删除(小事务+间隔,第 137 题分批同源)。事故三(加分):delete 后磁盘没降——空间碎片未回收;修复=optimize table(锁表代价)或 pt-online-schema-change。

### 取舍:选择决策树

删结构=drop;清全表(临时表/日志表)=truncate;条件删除=delete(分批);高频清空场景(日志表)→按时间分表(整表 drop 分区,免 delete)——分区表或按月建表是“删大表”的工程解。

## 案例

### 验证:三种删除的实测走查

验证:回滚断言(delete 后 rollback→数据回;truncate 后 rollback→数据仍空——对照立现);自增断言(delete 保留,truncate 复位);速度对照(百万行 truncate 秒级 vs delete 分钟级);隐式提交断言(事务中 delete+truncate→delete 部分已提交不可回滚)——四组固化差异,数据库模块实验可复跑。

### 追问链:删除三刀

一刀:软删除=逻辑删除标志位(deleted_at)——审计友好但查询全要带条件+唯一约束变复杂(唯一索引+软删冲突)。二刀:闪回=binlog/undo 恢复误删(delete 可用闪回工具,truncate/drop 只能备份)。三刀:归档=历史数据迁移归档库(生产库瘦身)——比删除更常用(可追溯)。

## 总结点

1. delete 行级可回滚,truncate 页级不可
2. drop 连结构全删
3. 大表清理用分批或分区
