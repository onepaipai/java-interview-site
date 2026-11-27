<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银查询沙盘:联合索引 (a,b,c)——查询 WHERE a=? AND b=? 走索引;WHERE b=? 不走(缺最左前缀);SELECT a,b,c 覆盖索引(不回表);ICP 索引下推(存储引擎层先过滤,减少回表)。database-advanced 2/6 题的完整版。

1. 最左前缀:联合索引按 (a,b,c) 排序——查询条件必须从最左列开始连续匹配(a=?/a=? AND b=?/a=? AND b=? AND c=? 均可;a=? AND c=? 部分使用;仅 b=? 或 c=? 不走)——范围条件(>,<,BETWEEN)后的列不再参与索引定位(但可参与 ICP 过滤)。
2. 覆盖索引:查询的所有列都在索引中(SELECT a,b,c,索引 (a,b,c) 覆盖)→无需回表(EXPLAIN Extra=Using index)——覆盖索引避免回表的随机 IO,性能提升显著;设计:将高频查询列加入索引(空间换时间)。
3. 索引下推(ICP):MySQL 5.6+——查询条件部分列在索引中→存储引擎层先过滤(减少回表次数)→EXPLAIN Extra=Using index condition;ICP 只对二级索引生效(聚簇索引即整行,无需下推)——条件列必须在索引列中(第 6 题 database-advanced)。

## 参考分析

### 第二步扩展① 机制:索引的 B+ 树结构与最左前缀

- 联合索引 (a,b,c) 的 B+ 树按 a→b→c 排序:先按 a 排,a 相同按 b 排,b 相同按 c 排——跳过 a 直接查 b=树的排列不对(无法二分)→不走索引。
- 类比字典:按"姓→名"排序,跳过姓查名=要遍历全字典。

### 第二步扩展② 反例:索引使用的两种事故

- 事故一:范围条件后索引失效——WHERE a=1 AND b>5 AND c=3——b 范围后 c 无法精确定位(但 ICP 可过滤)。
- 修复=调整索引列顺序(把等值条件放前,范围放后)。
- 事故二:隐式类型转换——varchar 列接数字字面量→类型转换→索引失效(EXPLAIN type=ALL)。
- 修复=统一类型(database-advanced 2 题)。

### 第二步扩展③ 取舍:索引的设计权衡

- 索引越多→写入越慢(每个索引都要维护)+空间越大。
- 索引越少→查询慢——按"查询频率×查询模式"设计索引(高频查询的组合条件→联合索引)。
- 冗余索引(单列索引被联合索引前缀覆盖)清理(第 50 题数据库索引优化)。

## 案例

### 第三步发散·验证与推演 验证:索引的走查核对

- 验证:EXPLAIN 走查——type(ref/range/index/ALL)+key(使用的索引)+Extra(Using index condition/Using index/Using filesort)。
- 四场景断言(最左前缀匹配/覆盖索引不回表/ICP 减少回表/范围后失效)——database-advanced 2/6 题的实测可复用。
- EXPLAIN ANALYZE 的 actual rows 对照(第 11 题数据库)。

### 第三步发散·追问扩展 追问链:索引三刀

- **Q1：索引列顺序的影响?**
  - 答：等值列在前,范围列在后(等值可精确定位,范围后失效);排序列跟随(GROUP BY/ORDER BY 列加入索引避免 filesort)。
- **Q2：前缀索引?**
  - 答：长字符串列(如 URL)用前缀索引(col(20))节省空间——但前缀索引无法覆盖索引(不包含完整列值);选择性(不同前缀值的区分度)决定前缀长度。
- **Q3：索引的维护成本?**
  - 答：每个索引增加 INSERT/UPDATE/DELETE 的开销(维护 B+ 树)——索引不是免费的,按查询频率设计(第 50 题数据库)。

## 总结点

1. 最左前缀,跳过左列不走索引
2. 覆盖索引不回表,ICP 引擎层过滤
3. 索引设计=查询频率×维护成本
