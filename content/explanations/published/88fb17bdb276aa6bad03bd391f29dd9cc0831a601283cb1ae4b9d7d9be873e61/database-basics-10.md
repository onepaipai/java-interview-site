<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银慢查询会诊沙盘:拿到 EXPLAIN 输出十几列——先看四件:type/key/rows/Extra,分别回答「什么访问方式/用没用索引/扫多少行/有哪些附加动作」;顺序错了会迷失在细节里。

1. 优先级一:type(访问方式)——优劣序 const>eq_ref>ref>range>index>ALL:ALL=全表扫(报警),index=全索引扫(比全表瘦但也是全量),ref=索引定位(合格起点);type 决定「扫描范围的数量级」,是最粗但最重要的粒度。
2. 优先级二:rows(预估扫描行数)+key(实际用的索引)——rows 直接换算 IO 量级;key=NULL=没走索引(与「建了索引」对照,定位失效原因——第 45 题失效族);key_len 判断联合索引用到第几列(第 3 题前缀);possible_keys 与 key 不一致=优化器弃用(统计过期或成本判断,analyze table)。
3. 优先级三:Extra——Using index(覆盖,好)/Using index condition(ICP)/Using filesort(排序未走索引,警惕)/Using temporary(临时表,警惕);filesort 与 temporary 是内存 CPU 放大器,常见于 ORDER BY/GROUP BY/DISTINCT。

## 参考分析

### 第二步扩展① 机制:四件套如何构成成本模型

- 优化器的成本≈扫描行数(rows)×行代价(type 决定)+附加动作(filesort/temporary 的排序归并成本)+回表(覆盖与否,第 5 题)——四件套恰好是这个模型的四个输入。
- 看 EXPLAIN 的本质=复算优化器的账,找到「哪一项可以砍」。
- rows 是估算(cardinality 统计),与实际行数偏差大时成本判断也偏差——analyze table 刷新统计是「EXPLAIN 看起来不对劲」的第一响应。

### 第二步扩展② 反例:读 EXPLAIN 的三种事故

- 事故一:只看 key 有值就放心——type=index 全索引扫也是「用了索引」,rows 百万。
- type 与 rows 必须同看。
- 事故二:忽视 rows 的估算性质——统计过期时优化器按错误 cardinality 选错索引(改道全表)。
- analyze+强制索引应急(第 45 题)。
- 事故三:Extra 的 filesort 当无物——小表无妨,大表+分页是灾难(排序缓冲溢出落盘)。
- ORDER BY 列进索引消除。

### 第二步扩展③ 取舍:EXPLAIN vs ANALYZE vs trace vs 慢日志

- 日常排查:EXPLAIN(不动数据)。
- 判断优化器为什么选错:EXPLAIN ANALYZE(8.0,真实执行+各步耗时)与 optimizer_trace(成本推导过程)。
- 圈定嫌疑:慢日志(第 48 题流程)。
- 四者构成「定位→诊断→归因」链——EXPLAIN 是入口,不是全部。

## 案例

### 第三步发散·验证与推演 验证:四件套断言组(本机可复跑)

- 验证:type 断言(同一查询改条件:type 从 ALL→ref 的对照——索引生效可见)。
- rows 断言(analyze 前后 rows 与 key 的漂移——统计影响)。
- Extra 断言(构造 filesort/Using index/ICP 三种 Extra 并消除其中两种——第 4/17 题呼应)。
- key_len 断言(联合索引 (a,b) 在 WHERE a=1 vs a=1 AND b=2 的 key_len 差——前缀参与可见)。
- EXPLAIN ANALYZE 断言(8.0 真实耗时 vs 估算)。
- 预期:四件套各自可测量、可改变。

### 第三步发散·发散要点 追问链:EXPLAIN 三刀

- **追问①·EXPLAIN FORMAT**：JSON——成本明细(cost_info)与嵌套结构,比表格版多一层「为什么」;
- **追问②**：optimizer_trace——优化器在候选索引间的成本推演(选错索引的归因证据,第 45 题统计过期同域);
- **追问③**：分区裁剪(partitions 列)与执行计划缓存——EXPLAIN 的输出随统计/参数动态变化,「计划漂移」要用 baseline/force index 治理(第 137 题重试稳定性同域)

## 总结点

1. 先 type 再 rows/key 后 Extra
2. ALL 与 index 都是全量扫描
3. rows 是估算,统计要新鲜
