<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/join.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/select.html)

</details>

## 参考回答

1. 内连接只保留满足连接条件的组合，外连接还保留指定侧未匹配行并补 NULL；连接后 WHERE 可能再次把这些行过滤掉。
2. WHERE 过滤聚合前的行，HAVING 过滤分组结果；比较 NULL 的 UNKNOWN 也会影响外连接结果。

## 参考分析

1. 要保留没有有效员工的部门，可把员工状态条件放在 LEFT JOIN 的 ON 中；移到 WHERE 会排除补空行。
2. COUNT(员工 ID) 忽略补出的 NULL，COUNT(*) 则会统计外连接保留行，不能随意替换。

## 案例

1. 教学场景：部门 1 有一个有效和一个停用员工，部门 2 没员工，要列出有效人数并保留空部门。

2. 以下会话临时表 SQL 比较 ON、WHERE 与 HAVING；预期三次查询依次为 (1,1)(2,0)、(1,1)、(1,1)，每对是部门及计数。

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

3. 验证空部门在 ON 过滤下保留、WHERE 下消失，HAVING 按分组计数筛选；H2 样本结果不代表已验证 MySQL 执行计划。

## 总结点

1. ON 匹配，WHERE 筛行。
2. HAVING 筛组，注意 NULL 和计数。
