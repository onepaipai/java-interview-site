<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银慢查询沙盘:索引建了却全表扫——函数包装/隐式转换/前导模糊/最左缺失/OR 混合/优化器改道六类失效;explain type=ALL 一眼识别。

1. 列被加工:where date(created)=今天(函数包装)/where id+1=10(运算)/where cast(...)=——索引存的是原值,加工后无法按树查找;修复=范围改写(created>=今天 0 点 and <明天)/把运算移到常量侧。
2. 类型不一致:字符串列用数字比(where phone=13800000000——隐式转数字,列被包装);字符集/排序规则不一致(join 两侧)同理;修复=类型对齐(phone='13800000000')。
3. 结构与统计类:like '%x' 前导模糊(树按前缀组织,前导通配无法定位——'%x%' 也一样)/联合索引跳过最左列(where b=1 对 (a,b) 无效)/OR 两边一个有索引一个无(退化为全扫)/优化器判断回表代价高于全扫(低选择性——性别列)+统计过期(cardinality 不准→改道);修复=覆盖索引/联合列序/analyze table。

## 参考分析

### 机制:失效的共同根因=有序性破坏

B+ 树加速的前提=索引列值有序可二分——任何“把列变换后比较”(函数/运算/隐式转换)都是拿变换后的值查未变换的树=无序可比;前导模糊=前缀未知无法定位分支;OR 混合=无法单树收窄;优化器改道=树虽可用但代价模型判全扫更快(这不是“失效”而是“主动不用”——区分两类)。

### 反例:失效的两种事故

事故一:日期函数包装——报表慢查询(全表扫);修复=范围条件(索引可用)。事故二:隐式转换——phone varchar 用数字查(MySQL 8 对字符串列=数值比较会转 double 全扫)+精度坑(大数字转 double 丢精度);修复=对齐类型。事故三(加分):统计过期——数据分布变了优化器仍用旧 cardinality 选错索引;修复=analyze table(或 forced index 应急)。

### 取舍:改写的通用套路

函数包装→范围条件;运算→常量侧;前导模糊→全文索引/搜索引擎/倒排(ES,第 152 题);跳过最左→补齐最左或建新索引;OR 混合→union 两支各自走索引;低选择性→联合(与高选择性列组合)或不用索引。

## 案例

### 验证:失效场景的实测走查

验证:explain 对照组(每种失效场景建一次 explain——type 从 ref 变 ALL;函数包装/隐式转换/前导模糊/最左缺失/OR 混合逐一复现+修复后恢复 ref);range 断言(范围改写后 type=range)——六场景断言组固化失效语义,数据库模块 explain 实验可复用。预期:每条失效都有 explain 证据与修复对照。

### 追问链:失效三刀

一刀:隐式转换细则=字符串列与数字比→列转数字(失效);数字列与字符串比→常量转数字(不失效)——方向决定生死。二刀:order by 与索引=排序列与索引一致免 filesort(Using filesort 出现=排序没走索引)。三刀:limit 深分页=offset 大→扫描浪费(延迟关联:先覆盖索引取主键再回表,第 48 题)。

## 总结点

1. 加工列=失效,改写为范围
2. 字符串列与数字比失效
3. explain type=ALL 是识别器
