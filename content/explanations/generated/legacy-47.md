<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/select.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账报表沙盘:订单 join 用户——inner 只留匹配行,left 保左表全量(无匹配补 null);where 过滤行(分组前)having 过滤组(分组后)。

1. 连接类型:inner join(两表匹配行)/left join(左表全量+右匹配或 null)/right join(镜像)/cross join(纯笛卡尔);on=连接条件,where=结果过滤——left join 时右表条件写在 on 与 where 语义不同(on 先滤再连,where 连完再滤,left 变 inner)。
2. where vs having:where 过滤“行”(分组/聚合前,不能用聚合函数);having 过滤“组”(分组后,可用聚合)——执行顺序:from→join→where→group by→having→select→order by→limit;where 不满足的行根本不进聚合(性能好),having 是聚合后再砍(代价高)。
3. 实践:能用 where 过滤绝不留到 having(having sum(amount)>100 中能在 where 用 amount>100 先滤);left join + where 右表条件=隐式 inner(需要“保留左表”时用 on 或 where 条件放 OR is null 分支)。

## 参考分析

### 第二步扩展① 机制:执行顺序为什么决定语义

- on 在连接时逐行评估(决定配不配对),where 在连接结果上评估(决定留不留)——left join 的“左全量”承诺在 on 阶段定,where 阶段砍掉 null 行=承诺作废(变 inner)。
- having 在聚合后(组已形成,只能按组指标砍)——顺序不是背条目,是理解承诺的时点。

### 第二步扩展② 反例:join 的两种事故

- 事故一:left join 右表条件写 where——统计报表突然少行(left 语义丢失)。
- 修复=条件移 on 或显式 or 右表 is null。
- 事故二:join 后 where 无索引列过滤——笛卡尔中转大(驱动表选择错)。
- 修复=驱动表走索引+小表驱动(第 48 题优化同源)。

### 第二步扩展③ 取舍:having 的合法场景

- 聚合指标过滤(having count(*)>10/sum>100)是 having 本职。
- 非聚合条件都该进 where。
- 分页+聚合(having 内 limit)注意语义(limit 作用于聚合结果行)。
- 报表 SQL 的可读性=CTE 子查询分步(每步一个语义)优于单条巨 SQL。

## 案例

### 第三步发散·验证与推演 实证:H2 会话表三查询对照

- 以下 SQL 在 H2(MODE=MySQL)实际执行(后端 DatabaseBasicsExamplesTest 真值测试同源)——三段查询依次输出 (1,1)(2,0)、(1,1)、(1,1):每对是部门及有效人数。
- ON 过滤保留空部门、WHERE 过滤丢失空部门、HAVING 按分组计数筛选。
```sql
CREATE TEMPORARY TABLE department_example(id INT PRIMARY KEY);
CREATE TEMPORARY TABLE employee_example(id INT PRIMARY KEY, dept_id INT, enabled INT);
INSERT INTO department_example VALUES(1),(2);
INSERT INTO employee_example VALUES(10,1,1),(11,1,0);
SELECT d.id, COUNT(e.id) AS active_count FROM department_example d
LEFT JOIN employee_example e ON e.dept_id = d.id AND e.enabled = 1
GROUP BY d.id HAVING COUNT(e.id) >= 0 ORDER BY d.id;
SELECT d.id, COUNT(e.id) AS active_count FROM department_example d
LEFT JOIN employee_example e ON e.dept_id = d.id
WHERE e.enabled = 1 GROUP BY d.id ORDER BY d.id;
SELECT d.id, COUNT(e.id) AS active_count FROM department_example d
LEFT JOIN employee_example e ON e.dept_id = d.id AND e.enabled = 1
GROUP BY d.id HAVING COUNT(e.id) >= 1 ORDER BY d.id;
```
- 验证:执行结果与理论语义一致,ON/WHERE 位置差异可复现。
- H2 样本结果不代表已验证 MySQL 执行计划。

### 第三步发散·追问① 验证:join/where 语义的实测走查

- 验证:left 语义断言(右表条件在 on→左表全量保留 null。
- 在 where→行数减少=inner 化——对照立现)。
- 聚合断言(where 先滤再聚合 vs having 聚合后滤——count 数值不同)。
- 执行顺序断言(别名可用性:where 不能用 select 别名,having 可以——顺序的可见证据)——三组固化语义,数据库模块 join 实验可复跑。

### 第三步发散·发散要点 追问链:SQL 三刀

- **追问①·join 算法**：NLJ(嵌套循环,索引驱动)vs Hash Join(MySQL 8.0.18+ 等值 join 内存哈希)——无索引 join 的救星
- **追问②·笛卡尔事故**：join 条件漏写→百万×百万;评审=join 必有 on
- **追问③·去重**：distinct(全行)vs group by(分组)vs 窗口函数 row_number(取组内最新——第 48 题优化同源)

## 总结点

1. inner 留匹配,left 保左全量
2. on 定配对,where 定留存
3. where 过滤行,having 过滤组
