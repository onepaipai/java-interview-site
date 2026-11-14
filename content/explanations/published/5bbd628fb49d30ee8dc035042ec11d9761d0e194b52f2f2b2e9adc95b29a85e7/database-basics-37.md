<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/char.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银工单系统沙盘:备注列从 VARCHAR(1000) 换 TEXT 后——内存临时表装不下(TEXT 不能进 memory 引擎的内存临时表)、覆盖索引失效、排序变慢;长度可估的列用 VARCHAR,超长二进制出库。

1. 行为差异:VARCHAR(N) 声明长度上限(行内存直接存,可全索引含覆盖/前缀)、排序在内存完成(短值);TEXT/BLOB——行内存存指针+溢出页(off-page 存储策略依长度)、不能有默认值(8.0 前不能带 default)、不能做内存临时表(排序/分组走磁盘临时表)、完整索引受限(必须前缀索引)——每一条都在惩罚「可估长度的列错用 TEXT」。
2. 选择依据=长度分布与访问模式:可估上限(≤几千字符,如标题/备注/URL)→VARCHAR(N)(N 按业务上限,P99 分布实测);真正超长(文章正文/HTML/JSON 文档)→TEXT+独立表(或对象存储存引用,主表只存指针);JSON 类型(8.0)半结构化(第 158 题契约)——按「长度可预测性×索引需求×更新模式」三维定。
3. 行溢出与读放大:ROW_FORMAT=DYNAMIC 下长 TEXT 全部 off-page——读一行多一次页访问(第 5 题回表放大同源);宽表 SELECT *(第 9 题)把 TEXT 全拉=网络/内存灾难;TEXT 列的更新=页重组(原位更新难)——TEXT 的每条行为差异都会在查询计划上显形。

## 参考分析

### 机制:溢出页与临时表为什么是 TEXT 的两座山

内存临时表(性能好)要求列可定长/短——TEXT 直接把临时表判去磁盘(temp_table 代价数量级上升,EXPLAIN Extra=Using temporary 且 status 里 created_tmp_disk_tables 涨);溢出页让「读整行」变成多页 IO+缓冲不友好;这两条都是「TEXT 影响的不只是它自己列」——它拖累包含它的任何查询(排序/分组/临时表),这就是「TEXT 要隔离到独立表」的机制依据(读主表不带 TEXT,按需再取)。

### 反例:TEXT 误用的两种事故

事故一:备注列 TEXT+ORDER BY 查询——磁盘临时表+全行读放大,报表超时;改 VARCHAR(500) 后内存排序;事故二:正文列放主表与高频列同查——宽表 * 拉正文(第 9 题);拆表(正文表按主键取)或对象存储+URL;事故三:TEXT 上建完整索引失败/前缀索引区分度不足(第 45 题)——检索需求改用全文索引(第 8 题倒排)。

### 取舍:VARCHAR 上限/TEXT 拆表/对象存储

N 的取值=业务 P99 长度×1.5(不是拍 255/1000,实测分布);长文本+高频完整读取:拆 TEXT 表(主表窄,按需 join——第 33 题JOIN 取舍);超长只读文档:对象存储+DB 存元数据(URL/哈希);JSON 列:结构化查询需求强才用(生成列+索引),否则 TEXT+应用解析——类型选择的本质=访问模式建模。

## 案例

### 验证:类型断言组(本机可复跑)

验证:临时表断言(VARCHAR vs TEXT 列的 GROUP BY:created_tmp_disk_tables 差异——status 对照);溢出断言(长 TEXT 行的 off-page(information_schema/长度阈值推演)+读耗时);覆盖断言(VARCHAR 可覆盖,TEXT 前缀索引不可——第 4 题呼应);更新代价断言(TEXT 更新触发页重组 vs VARCHAR 原位);迁移断言(TEXT→VARCHAR 同数据的长度分布实测定 N)。预期:两座山(临时表/溢出)显形。

### 追问链:类型三刀

一刀:JSON 类型的空间与半结构化——JSON 列+生成列虚拟索引(第 36 题 collation 同域:生成列的另一次登场);二刀:大字段与备份/复制的放大——TEXT 大行让 binlog ROW 巨大(第 42 题批量更新主从延迟同域);三刀:对象存储的边界——事务一致性(DB 元数据与对象存储最终一致,补偿/对账,第 152 题)。

## 总结点

1. 可估长度用 VARCHAR,TEXT 拖临时表落盘
2. TEXT off-page=读放大,隔离拆表
3. 超长文档出库到对象存储
