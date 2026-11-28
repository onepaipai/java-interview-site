<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银报表沙盘:运营要"每日连续登录天数排名/每组交易额前 3/月度行转列汇总"——高级 SQL 的四个高频场景与窗口函数的用法。

1. 窗口函数四件套:ROW_NUMBER()(每组编号,每组前 N 名)、RANK()/DENSE_RANK()(并列排名)、SUM/AVG OVER(累计/移动平均)、LAG/LEAD(前后行对比——当日登录=当日日期-上次日期=1 即连续)。
2. 行转列:CASE WHEN 按值分列聚合(MAX(CASE WHEN month=1 THEN amt END) AS m1)或 PIVOT 语法(MySQL 8.0 无 PIVOT,用 CASE 模式);列转行反之(UNION ALL 或 JSON_TABLE)。
3. 连续登录:LAG(登录日期) OVER(PARTITION BY 用户 ORDER BY 日期)→日期差=1 连续→日期差!=1 断开→DATEDIFF(日期,最小断开日期)即连续天数;或 ROW_NUMBER-日期 常量分组法(分组内 ROW_NUMBER 递增而日期也递增,差值恒定即连续段)。

## 参考分析

### 第二步扩展① 机制:窗口函数与 GROUP BY 的区别

- GROUP BY 把多行聚成一行(丢失明细)。
- 窗口函数在每行上追加聚合值(保留明细)——"每行都带排名/累计/前后的值"。
- PARTITION BY 定义窗口范围(分组),ORDER BY 定义窗口内排序,帧子句(RANGE/ROWS)定义聚合的行范围——三者的组合覆盖几乎所有"分组排名/累计/对比"场景。

### 第二步扩展② 反例:窗口 SQL 的两种事故

- 事故一:ROW_NUMBER 不加 PARTITION——全表一个排名(每组前 N 变全表前 N)。
- 修复=PARTITION BY 组列必写。
- 事故二:连续登录用自连接——性能极差(每行自连接全表)。
- 修复=LAG+日期差一行解决(窗口函数比自连接高效得多)。

### 第二步扩展③ 取舍:SQL 复杂度与应用层的边界

- 窗口函数能做的: rank/topN/累计/移动平均/连续段——在数据库做(数据在本地,避免传输)。
- 不建议:多层嵌套窗口+子查询混合(可读性崩塌)——复杂报表逻辑拆成 CTE(WITH 子句)分层,或搬到应用层/报表工具。
- SQL 的可维护性与性能要平衡。

## 案例

### 第三步发散·验证与推演 验证:四场景的 SQL 走查

- 验证:本机 H2/MySQL 跑四组 SQL——每组前 N(ROW_NUMBER OVER PARTITION BY dept ORDER BY amt DESC≤3)。
- 连续登录(LAG 差值法,3 天连续用户集正确)。
- 行转列(CASE WHEN 月列输出)。
- 累计(SUM OVER ORDER BY 日期 RANGE UNBOUNDED PRECEDING)——四组结果断言与预期一致(database-basics C 系列的 SQL 实测框架复用)。

### 第三步发散·追问扩展 追问链:SQL 三刀

- **Q1：窗口函数的索引优化?**
  - 答：PARTITION BY+ORDER BY 的列组合建索引可避免排序(窗口函数隐式排序是大开销);EXPLAIN 检查是否走了索引。
- **Q2：大表的窗口函数性能?**
  - 答：窗口函数需要排序(除非索引覆盖),亿级表的窗口操作考虑分桶/预聚合/物化视图;数据库做不了的就上计算引擎。
- **Q3：MySQL 8.0 之前怎么写?**
  - 答：用变量(@rownum:=@rownum+1)模拟窗口,或应用层处理——8.0 是分水岭,老版本方案要标注迁移路径。

## 总结点

1. 窗口保明细,GROUP BY 丢明细
2. LAG 差值=连续段判定
3. PARTITION BY 别忘写
