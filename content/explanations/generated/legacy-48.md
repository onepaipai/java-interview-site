<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银慢查询沙盘:报表接口 8 秒——explain 定位(全扫/filesort/深分页)→索引/改写/结构三层优化;先测量再动手(explain 是起点)。

1. 索引层:补索引(查询列组合建联合,等值在前范围在后);覆盖索引免回表(Extra: Using index);排序与分组消除 filesort(索引序与 order by 一致);前缀索引处理长文本;删除冗余索引(写放大+优化器困惑)。
2. SQL 改写层:select * →按需列(覆盖机会+带宽);深分页 offset→延迟关联(先覆盖索引取主键再回表)或游标(where id>last limit n);函数包装改范围(第 45 题);OR 拆 union;join 小表驱动+被驱动表走索引;count(*) 大表→估算(explain rows)或计数表。
3. 结构层:大表分区(按时间,查询裁剪分区);冷热分离(历史归档,第 46 题归档同源);读多写少加缓存(第 152 题);汇总表/宽表(预计算,报表走数仓);分库分表(容量与并发上限的最后手段,第 155 题)。

## 参考分析

### 机制:explain 怎么读

type 优劣序:const>eq_ref>ref>range>index>ALL(ALL=全扫,range 起算合格);key=实际用的索引;rows=预估扫描数(越小越好);Extra:Using index(覆盖)/Using where(服务层过滤)/Using filesort(排序没走索引)/Using temporary(临时表——group by/distinct 代价);慢日志(slow_query_log)圈定嫌疑,explain 逐条确诊——测量先行,不猜。

### 反例:优化的两种事故

事故一:无测量乱建索引——建了十个单列索引没一个命中(查询是多列组合);修复=explain 确认访问路径再建联合。事故二:优化过度——索引建太多写性能崩(每次 insert 维护全部索引);修复=索引审计(使用率视图 sys.schema_unused_indexes)定期清理。

### 取舍:优化的投入边界

优化顺序=索引>SQL 改写>缓存>结构>架构(投入递增);达到业务可接受(接口 P99<500ms)即停(过度优化=维护成本);慢查询治理常态化=监控告警(pt-query-digest 周报)+上线前 SQL 评审(第 151 题质量闸同源)。

## 案例

### 验证:优化效果的实测走查

验证:基线断言(优化前 explain+耗时);索引断言(建联合索引→type ref/rows 降/耗时降——前后对照);延迟关联断言(limit 100000,20 改写后耗时对照——毫秒级 vs 秒级);filesort 消除断言(排序列进索引→Extra 无 filesort)——四组量化优化收益,数据库模块优化实验可复用。

### 追问链:优化三刀

一刀:慢日志参数=long_query_time(0.5s 起)+log_queries_not_using_indexes(注意噪声)。二刀:join 算法演进=NLJ→BNL(块嵌套,无索引缓冲)→Hash Join(8.0.18+)——无索引 join 从灾难变可用但仍要索引。三刀:窗口函数(MySQL 8.0)=row_number/rank 取组内 top(替代自关联子查询,可读性+性能双优)。

## 总结点

1. explain 先行:type/rows/Extra
2. 索引>改写>缓存>结构
3. 深分页用延迟关联或游标
