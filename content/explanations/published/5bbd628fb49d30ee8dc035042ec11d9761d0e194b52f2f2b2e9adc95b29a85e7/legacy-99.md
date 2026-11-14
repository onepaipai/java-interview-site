<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银报表沙盘:LIMIT 1000000, 20——MySQL 需扫描前 1000020 行丢弃前 1000000 行(OFFSET 越深越慢);优化=游标分页(WHERE id > last_id LIMIT 20)或覆盖索引子查询。database-advanced 14 题的完整版。

1. 深分页的问题:LIMIT offset, size→MySQL 扫描 offset+size 行→丢弃 offset 行→返回 size 行——OFFSET=1000000→扫描 1000020 行(绝大多数被丢弃);耗时随 offset 线性增长(第 14 题 database-advanced 的"数数vs坐标"类比)。
2. 游标分页(推荐):WHERE id > last_seen_id ORDER BY id LIMIT 20——从上次位置继续(索引定位精确,不扫描丢弃行)——条件=id 单调递增(自增主键/时间+id 复合游标);不支持跳页(只支持"下一页/上一页")。
3. 覆盖索引子查询:SELECT * FROM t INNER JOIN (SELECT id FROM t WHERE 条件 ORDER BY id LIMIT 1000000,20) AS tmp ON t.id=tmp.id——子查询走覆盖索引(不回表,只扫 ID)→外层按 ID 精确查找——支持跳页,但 OFFSET 依然随页深增加。

## 参考分析

### 机制:OFFSET 的成本为什么随页深线性增长

LIMIT 1000000,20=扫描前 1000020 行→丢前 1000000 行→返回 20 行——扫描量=offset+size,offset 越大扫描越多;游标分页=索引定位到 last_id→扫描 20 行(常数成本)——OFFSET 的成本是"从第一行开始数数",游标是"从书签开始读"(database-advanced 14 题的类比)。

### 反例:深分页的两种事故

事故一:OFFSET 1000000→30 秒超时(运营报表翻到深页);修复=游标分页或覆盖索引子查询。事故二:游标分页的游标失效——游标参数(last_id)由客户端伪造(跳到非授权数据);修复=游标参数由服务端下发(客户端透传)+游标绑定查询条件(第 10 题database-advanced)。

### 取舍:游标 vs OFFSET 的产品边界

游标:成本恒定但不支持跳页(产品允许时优先);OFFSET:支持跳页但深页慢(限最大页深);搜索引擎(Elasticsearch):search_after(游标)或 scroll(快照)——产品与技术的协同:产品侧限制深翻页(导出替代)。

## 案例

### 验证:深分页的走查核对

验证:OFFSET 对照(LIMIT 1000000,20 vs LIMIT 0,20 的耗时——前者显著慢);游标断言(WHERE id>last_id LIMIT 20 的耗时恒定);覆盖索引断言(子查询走索引不回表);database-advanced 14 题的实测(同秒 100 条的漏读+游标修复)。验证:耗时对照可程序化(同环境不同方案计时)。

### 追问链:分页三刀

一刀:"排序键的选择?"——游标排序键必须唯一且有序(created_at,id 复合——同秒并列由 id 补齐);不唯一的排序键=漏读或重读。二刀:"总页数怎么显示?"——游标分页不支持总页数(需要 COUNT 全表——成本高);产品侧"下一页/上一页"替代页码跳转(第 14 题 database-advanced)。三刀:"ES 的深分页?"——from+size 也有限制(默认 10000);search_after(游标)+PIT(时间点快照)——ES 与 MySQL 的深分页策略同构。

## 总结点

1. OFFSET 扫描丢弃,成本随页深线性
2. 游标分页恒定成本,不支持跳页
3. 覆盖索引子查询是折中方案
