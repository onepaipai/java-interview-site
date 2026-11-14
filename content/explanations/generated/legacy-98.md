<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 DBA 沙盘:慢查询日志(slow_query_log)捕获慢 SQL→EXPLAIN 分析执行计划(type/key/rows/Extra)→优化(索引/改写/架构)→验证(执行时间对比)——database-advanced 2/11 题的完整版。

1. 排查五步:一,慢查询日志(long_query_time+log_queries_not_using_indexes)捕获;二,EXPLAIN(type=ALL 全扫/key=NULL 未走索引/rows/Extra=filesort/temporary);三,优化(索引/改写/结构);四,验证(EXPLAIN 对照+耗时);五,持续监控。
2. EXPLAIN 关键字段:type(const>eq_ref>ref>range>index>ALL)、key(实际索引)、rows(预估扫描数)、Extra(Using index 覆盖/Using filesort 排序/Using temporary 临时表/ICP)——四个字段定位 90% 问题(第 48 题详版)。
3. 优化方向:加索引(联合索引按最左前缀,第 94 题)/SQL 改写(子查询→JOIN/OR→UNION,第 2 题数据库)/分页优化(游标替代 OFFSET,第 14 题 database-advanced)/架构(读写分离/缓存,第 137 题)——每步优化后 EXPLAIN 验证(不是"加了索引就行")。

## 参考分析

### 机制:EXPLAIN 的"成本估算"与"实际执行"

EXPLAIN=优化器的成本估算(type/rows/key——基于统计信息,可能不准);EXPLAIN ANALYZE=实际执行(MySQL 8.0.18+,actual rows/actual time/loops)——估算与实际的偏差=统计信息失真的信号(ANALYZE TABLE 更新统计);database-basics 11 题详解 TREE 输出。

### 反例:慢 SQL 的两种事故

事故一:只加索引不改 SQL——SQL 写法导致索引失效(隐式转换/函数操作列/前导通配,第 2 题数据库)——索引加了但没用上;修复=改写 SQL(让条件可走索引)。事故二:索引加了但优化器不走——统计信息过时(表数据变化后未 ANALYZE)→优化器误判成本;修复=ANALYZE TABLE 更新统计或 force index(最后手段,第 2 题数据库取舍)。

### 取舍:SQL 优化与应用层的分工

SQL 层优化:索引/改写/参数(数据库层面);应用层优化:缓存(第 20 题缓存)/异步(第 39 题)/批量(第 125 题批处理)/分页(游标)——SQL 优化有上限(数据量太大SQL 也慢),应用层优化无上限——按"优化成本与收益"分层。

## 案例

### 验证:慢 SQL 的走查核对

验证:慢查询日志断言(long_query_time=1 捕获>1s 的 SQL);EXPLAIN 断言(type/key/rows/Extra 各字段解读);EXPLAIN ANALYZE 断言(actual rows vs 估算 rows——偏差=统计失真);优化验证断言(加索引后 type 从 ALL→ref+rows 减少+执行时间下降)。验证:database-advanced 2/11 题的实测可复用(EXPLAIN ANALYZE 对照)。

### 追问链:SQL 三刀

一刀:"慢 SQL 的根因分类?"——索引缺失(全表扫)/索引失效(写法导致不走)/数据量(单表太大)/锁等待(第 101 题死锁)/服务器资源(CPU/IO)——分类决定优化方向(加索引/改 SQL/分库/调参)。二刀:"EXPLAIN 的 Extra 详解?"——Using index(覆盖)/Using where(服务器过滤)/Using index condition(ICP)/Using filesort(额外排序)/Using temporary(临时表)——每种 Extra 对应不同的优化方向。三刀:"慢 SQL 的预防?"——SQL 审计上线前(第 151 题代码评审的 SQL 检查)+慢查询日志持续监控+性能基线(EXPLAIN ANALYZE 基线,第 49 题)——预防优于排查。

## 总结点

1. 慢 SQL 五步:日志→EXPLAIN→优化→验证→监控
2. type=ALL 全表扫,Extra 看细节
3. 每步优化后 EXPLAIN 验证
