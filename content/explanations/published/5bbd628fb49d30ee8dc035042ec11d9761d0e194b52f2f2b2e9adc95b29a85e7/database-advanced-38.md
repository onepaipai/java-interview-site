<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/statement-explain-information.html.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：MySQL 8.4 / InnoDB 教学场景：CPU 90% 而 IO 利用率 20%，排除了缺索引的常识性猜测后仍无头绪。建立"IO 正常型 CPU 高"的排查清单：解析开销、排序与哈希、锁自旋、函数计算与无法走索引的谓词。

1. 先定位消耗者：performance_schema 的 events_statements_summary_by_digest 按 CPU 视角排序（SUM_TIMER_WAIT 高而 ROWS_EXAMINED/SUM_TIMER_WAIT 比值异常的），区分"扫了很多行"（IO 型）与"扫得不多却算得久"（CPU 型）。
2. CPU 型消耗的四类候选：复杂表达式与函数计算（正则、加密、JSON 解析在 SQL 里做）、大排序与哈希构建（内存临时表溢出）、锁自旋与线程上下文切换、解析开销（超长 SQL、海量值 IN 列表）。
3. 修复方向各对应：计算下移应用或前移到写入时、SQL 改写减少排序规模、缩短持锁与自旋、SQL 瘦身（语句模板化、IN 分批）。每类都有对应的 performance_schema 证据。

## 参考分析

### 机制：CPU 型与 IO 型是两种"贵的姿势"

IO 型贵在"搬很多数据"（rows examined 巨大），CPU 型贵在"对不多的数据做昂贵的计算"。类比厨房：IO 型是买了很多菜（浪费在采购），CPU 型是刀工炒功太慢（浪费在加工）——药方完全不同，先把两种浪费分开。

### 反例：把 CPU 型当 IO 型治理的三次无效调参

团队对 90% CPU 先后加 Buffer Pool、加从库、加索引——无效，因为 digest 显示一条含 REGEXP 与 JSON_EXTRACT 的语句贡献了 60% CPU，且 rows examined 很小。修正：正则匹配移到应用预筛、JSON 字段拆为生成列并加索引。药方错在没分清消耗类型。

### 取舍：计算放哪一层的判断

SQL 内计算（正则、JSON）的好处是数据不搬家，坏处是占用数据库 CPU（最稀缺资源）且难以水平扩展；应用层计算增加数据传输但 CPU 可独立扩容。原则：能走索引的过滤留在 SQL，行级复杂计算下移应用，写入期预计算（生成列）优先于读取期计算。

## 案例

### 对照操作：digest 表的消耗定位

教学验证：注入一条 JSON_EXTRACT 高频语句，对比 events_statements_summary_by_digest 的 SUM_TIMER_WAIT 与 SUM_ROWS_EXAMINED。预期：该语句 TIME 占比第一而 ROWS 占比极低——CPU 型指纹。修复生成列后占比回落。实验可复跑。

### 追问：海量值 IN 列表为什么吃 CPU

数千个值的 IN 列表在优化与匹配阶段的比较成本线性于值数，且语句解析缓存失效（每次值集不同都算新语句）。治理：拆批、临时表 JOIN、或改写为范围条件——本质是让解析与比较的规模可控。

## 总结点

1. 先分 IO 型与 CPU 型两种浪费
2. digest 表按时间与行数双维度排
3. 计算下移，SQL 瘦身
