<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银证件号沙盘:unique 索引列里 NULL 能插无数行(NULL≠NULL,唯一约束「失效」);WHERE col=NULL 永远空(NULL 判等用 IS);COUNT(col) 不计 NULL——三值逻辑贯穿查询与约束。

1. 三值逻辑:NULL 与任何值比较结果都是 UNKNOWN——WHERE 只留 true,UNKNOWN 被滤掉;col=NULL 恒空、col<>value 漏 NULL 行、NOT IN 含 NULL 全空;判定必须 IS NULL/IS NOT NULL。
2. 唯一约束与 NULL:唯一索引允许多个 NULL(NULL 互不相等)——「非空才唯一」的业务要显式处理:生成列技巧(非空时 unique 键,空时固定值)或应用层保证+对账兜底。
3. 聚合与排序:COUNT(col) 不计 NULL、AVG 分母=非空数(≠COUNT(col));ORDER BY 中 NULL 位置依实现(MySQL 8.0 asc 最小在前)——统计口径要显式,NULL 是「未知」不是「空值」。

## 参考分析

### 机制:UNKNOWN 为什么污染条件组合

SQL 的谓词是三值逻辑——AND/OR/NOT 对 UNKNOWN 的传播:NOT UNKNOWN=UNKNOWN(非「已知」仍未知)——导致「NOT (col=value)」漏掉 NULL 行(直觉里 NOT 应该补集,但 UNKNOWN 的补集还是 UNKNOWN);IN 含 NULL 时 NOT IN 全 UNKNOWN(整个条件失效)——这是「NOT IN + NULL」事故的根源;每一条含 NULL 列的 WHERE 都要过「UNKNOWN 传播」的脑内检查。

### 反例:NULL 的三种事故

事故一:NOT IN 子查询含 NULL——返回空集(排查半天发现是数据里一条 NULL);修复=NOT EXISTS 或子查询过滤 NULL;事故二:唯一列插 NULL 绕过约束——「唯一」业务被 NULL 钻空(无数空证件号);设计列级处理(NOT NULL+默认值/生成列技巧);事故三:统计口径混用——AVG 的分母是非空数,业务以为按全行平均;COALESCE 显式化。

### 取舍:允许 NULL vs NOT NULL+默认

业务上「未知/未填」真实存在(证件未录入)——NULL 语义精确但逻辑陷阱多;NOT NULL+默认值('' / 0 / 特殊码)消灭三值逻辑但污染语义(默认值与真实值不可分);折中=核心标识列 NOT NULL(必有值),可空列少而明确+查询侧 COALESCE/IS NULL 显式处理——NULL 是模型设计的一部分,不是数据质量的借口。

## 案例

### 验证:NULL 断言组(本机可复跑)

验证:比较断言(col=NULL 空/IS NULL 命中/NOT IN 含 NULL 全空 vs NOT EXISTS 正常——三值传播复现);唯一断言(可空唯一列插多行 NULL 成功——约束语义;生成列方案的唯一生效);聚合断言(COUNT(col) 与 COUNT(*) 差=NULL 数;AVG 分母=非空数);排序断言(NULL 在 asc/desc 的位置);统计口径断言(业务报表的 NULL 处理显式化)。预期:三值逻辑与约束语义双闭环。

### 追问链:NULL 三刀

一刀:三值逻辑与 EXISTS 的免疫——EXISTS 只看「有无行」,NULL 不污染(NOT EXISTS 替代 NOT IN 的原理);二刀:索引与 NULL——普通二级索引存 NULL(可检索 IS NULL),覆盖索引含 NULL 列的语义(第 4 题);三刀:ORM/JSON 的 null 语义——应用层 null/undefined 与 DB NULL 的映射(第 158 题契约),序列化边界的 null 丢失。

## 总结点

1. NULL=UNKNOWN,NOT IN 染色全空
2. 唯一索引允许多 NULL,业务要显式防
3. IS NULL 显式判定,别用等号
