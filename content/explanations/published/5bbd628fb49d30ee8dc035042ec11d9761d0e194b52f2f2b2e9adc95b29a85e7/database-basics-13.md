<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账报表沙盘:COUNT(*) 返回行数(含全 NULL 行),COUNT(col) 返回 col 非 NULL 的行数——差一行,对账差一分钱;两者在优化器眼里成本也不同。

1. 语义差异(本质):COUNT(*)=结果集的行数(计数动作与列无关——SQL 标准明确 * 是行计数);COUNT(col)=col IS NOT NULL 的行数(显式排除 NULL);COUNT(1) 与 COUNT(*) 等价(1 恒非空,优化器同路);COUNT(DISTINCT col)=去重非空计数——四个写法四个语义,混用即对账事故。
2. 成本差异(InnoDB):COUNT(*) 优化器选最瘦索引树扫;有 WHERE 时覆盖索引免回表;COUNT(col) 额外做 NULL 判断;结论以 EXPLAIN 为准——语义与成本交织,别背口诀。
3. 工程纪律:统计行数用 COUNT(*)(语义最准+成本最优);按列计数是业务语义,别当优化手段;大表计数用估算(explain rows)或计数表/Redis——「COUNT(1) 更快」是 MyISAM 时代残响。

## 参考分析

### 机制:NULL 为什么让两个 COUNT 分家

COUNT(col) 的语义=「对每行求 col 值,非空才计数」——NULL 的三值逻辑下,col IS NOT NULL 是显式谓词;COUNT(*) 不求值任何列,只数行——「行存在」与「某列有值」是两个事实;对账场景:明细行 col 可能 NULL(冲正行),COUNT(*) 含冲正、COUNT(col) 不含——差值即冲正数;业务要哪个必须在 SQL 里显式表达,「看起来等价」的写法埋雷。

### 反例:计数的两种事故

事故一:对账两边 COUNT 写法不同(* vs col)——差值被当「数据不平」排查半天,其实是语义差;统一写法+注释。事故二:大表 COUNT(*) 做接口——每请求全索引扫(百万行),QPS 高时 CPU 崩;估算/计数表/缓存计数(第 152 题缓存同源)。

### 取舍:精确计数 vs 估算 vs 计数器

精确且小表:COUNT(*);精确且大表:计数表(事务内同增减,第 16 题原子性同域)或 Redis(最终一致,容忍误差);展示用:估算(explain rows/information_schema TABLE_ROWS,InnoDB 是估算值);「精确到行」的代价是全扫,业务上多数展示场景容忍 1% 误差——先问用途再选方案。

## 案例

### 验证:计数断言组(本机可复跑)

验证:语义断言(含 NULL 列的表:COUNT(*)==行数,COUNT(col)==非空数,差值==NULL 数——三值对照);成本断言(EXPLAIN:COUNT(*) 选最瘦索引 vs 无索引表扫;COUNT(col) 的执行差异);估算断言(information_schema TABLE_ROWS 与真实 COUNT 的偏差);MyISAM 对照(如可测:无 WHERE 直读元数据——历史差异的来源说明)。预期:语义与成本双维度分清。

### 追问链:计数三刀

一刀:GROUP BY 下的 COUNT——分组计数与 HAVING 过滤(第 47 题 where/having),语义差异同样存在;二刀:窗口函数计数——COUNT(*) OVER() 与行级聚合的混合(第 48 题窗口函数);三刀:精确计数与分页——分页总数用估算+「还有更多」提示(游标分页,第 14 题),成本骤降。

## 总结点

1. COUNT(*) 数行,col 数非空
2. COUNT(1) 与 * 等价,别信优化传言
3. 大表计数:估算或计数表
