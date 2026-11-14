<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

</details>

## 参考回答

1. 先区分索引不能用于高效定位与优化器认为不值得用。类型转换、列上表达式、前导通配符、缺前缀等可能改变访问条件。
2. 统计、选择性、返回比例和排序也影响选择，不能背 OR、范围或 NULL 就一定失效的绝对规则。

## 参考分析

1. 后续列可能仍过滤、覆盖或辅助排序；全索引扫描也不是高效等值定位。
2. 函数索引和其他优化存在适用条件，必须按实际语句、版本和计划核对。

## 案例

1. 教学场景：同一 SQL 小租户走索引，大租户扫描，团队误以为数据库随机失效。

2. 保留参数和数据分布，核对类型与统计，比较范围、过滤、返回量及实际成本。

3. 验证结果语义不变且计划可解释，避免无证据强制索引或为追求命中破坏匹配。

## 总结点

1. 可定位性与成本选择分清。
2. 用计划和分布替代失效口诀。
