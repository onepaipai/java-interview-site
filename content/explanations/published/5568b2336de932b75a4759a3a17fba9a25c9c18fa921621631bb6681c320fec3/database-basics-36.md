<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账户名沙盘:unique 索引挡不住 'Wang' 与 'wang'(collation 不区分大小写)——唯一性的判定单位是「排序规则下的等价类」,不是字节;utf8mb4_general_ci 与 _bin 差一个业务语义。

1. collation 决定「什么算相等」:general_ci/unicode_ci 不区分大小写(Wang=wang 唯一冲突)、PAD SPACE 忽略尾空格;utf8mb4_bin 按字节比较(区分一切)——唯一严格度=collation 选择。
2. 存储与显示的两层:字符集(utf8mb4)决定「能存什么」(emoji/生僻字,utf8 缺 4 字节会截断乱码——legacy/50 varchar 字符数同源);排序规则决定「怎么比较」(唯一/排序/分组)——两层独立配置(表/列级可不同);JOIN 两列 collation 不一致→隐式转换→索引失效(第 45 题失效族)。
3. 业务语义决策:账户名/邮箱要「视觉唯一」→_ci(大小写不敏感算同一账户);凭据类(密码哈希/令牌)必须 _bin(字节级唯一,大小写敏感);混合需求(显示不敏感+存储保原样)=存原值+生成列小写索引——collation 是业务规则在 DB 层的编码。

## 参考分析

### 第二步扩展① 机制:比较规则如何贯穿索引与查询

- 索引键的比较、WHERE 等值、GROUP BY 分组、DISTINCT 全部走 collation——同一套规则保证一致性(ci 下 unique/where/group 行为一致)。
- 跨 collation 比较=隐式转换(优先级规则:显式 COLLATE>bin>…)+索引失效(两侧 collation 不同时)。
- PAD SPACE(多数 utf8mb4 ci)忽略尾空格——'abc' 与 'abc ' 在 unique 下冲突(0.0.1 版本 NO PAD 变化)——「相等」的定义比直觉宽,这正是事故来源。

### 第二步扩展② 反例:collation 的三种事故

- 事故一:邮箱列 _ci——已有 Wang@x 与 wang@x 视为同账户(业务想区分)——迁移到 _bin 要清理冲突数据。
- 反之凭据列 _ci 是安全洞。
- 事故二:JOIN 两表 collation 不一致——隐式转换索引失效(第 45 题),统一 collation。
- 事故三:utf8→utf8mb4 迁移截断——emoji 写入报错或截断(行宽变化),先测字符宽度(第 50 题varchar)。

### 第二步扩展③ 取舍:_ci/_bin/生成列的选型

- 全 _bin=最严格但「Wang」与「wang」是两账户(登录歧义)。
- 全 _ci=视觉唯一但凭据危险。
- 混合=按列语义选(凭据 bin、用户标识 ci)+生成列(lower(col) 唯一索引)实现「存原样、判不敏感」——collation 的选择要过一遍「哪些列是凭据、哪些是标识、哪些只是文本」。

## 案例

### 第三步发散·验证与推演 验证:collation 断言组(本机可复跑)

- 验证:唯一断言(_ci 列 'Wang'/'wang' 唯一冲突复现。
- _bin 列共存——语义对照)。
- 尾空格断言(PAD SPACE 下 'abc'/'abc ' 冲突。
- NO PAD(8.0 _0900 系)区分)。
- JOIN 断言(两列 collation 不同→EXPLAIN 索引失效,统一后 ref)。
- 字符集断言(emoji 在 utf8mb4 存取 vs utf8 报错)。
- 生成列断言(lower 生成列唯一索引对大小写变体拦截)。
- 预期:相等语义的三种口径可见。

### 第三步发散·发散要点 追问链:collation 三刀

- **追问①**：排序规则的排序语义——中文拼音排序(pinyin collation/GBK 排序)与业务列表显示;
- **追问②**：迁移治理——collation 全库统一(检查表+convert + 重建索引),utf8mb4_0900_ai_ci(8.0 默认)与 5.7 的差异(第 44 题迁移版本管理同域);
- **追问③**：应用层映射——Java String 比较与 DB collation 的不一致(应用 equals 区分大小写,DB unique 不区分)——两端语义对齐是契约(第 158 题)

## 总结点

1. collation=相等语义,唯一性跟着走
2. 凭据 bin,标识 ci,存原样用生成列
3. JOIN 两侧 collation 必须一致
