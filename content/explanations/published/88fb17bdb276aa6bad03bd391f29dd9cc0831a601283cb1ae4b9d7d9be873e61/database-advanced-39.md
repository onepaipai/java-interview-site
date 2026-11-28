<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-disk-io.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：MySQL 8.4 / InnoDB 教学场景：IO 饱和告警后第一反应是加 Buffer Pool，结果读型负载缓解、写型负载反而恶化。区分读 IO 与写 IO 的来源，给出"先分类再调参"的诊断路径。

1. 读 IO 主导（命中率低、数据集大于 Buffer Pool）：加 Buffer Pool 直接提升缓存命中，读 IO 下降——加池有效。
2. 写 IO 主导（脏页刷新、redo 写入、双写缓冲）：加池让更多脏页滞留，刷新风暴更猛——加池可能恶化；方向是调 innodb_io_capacity、redo 文件大小、刷脏策略。
3. 诊断先分型：performance_schema 与 InnoDB 指标区分读 IO（logical reads 与命中率、read ahead）与写 IO（checkpoint age、dirty pages 比例、doublewrite），再决定加池还是调刷脏。

## 参考分析

### 第二步扩展① 机制：Buffer Pool 只缓存"读的答案"，不消化"写的产出"

- 读 IO 来自"要的数据不在池里"——池够大就命中。
- 写 IO 来自"改过的页必须落盘"——这是持久性义务，池只改变"什么时候刷"，不改变"要不要刷"。
- 类比水库只调节灌溉取水（读），泄洪（脏页刷新）由上游来水量决定——水库再大也改变不了雨量。

### 第二步扩展② 反例：写高峰加池后的刷新风暴

- 大批量写入场景把 Buffer Pool 从 16G 加到 48G：脏页占比上升、checkpoint age 逼近上限引发激进刷新，IO 饱和反而加剧，P99 抖动增大。
- 正确动作：提高 innodb_io_capacity（匹配磁盘真实能力）、加大 redo 让 checkpoint 更平缓、写批量分批。
- 加池是读型药方误用于写型病。

### 第二步扩展③ 取舍：容量参数与负载参数的先后

- 调参次序：先确认负载画像（读/写主导）→ 读主导调池与命中率 → 写主导调 io_capacity 与 redo → 两者都紧张才考虑硬件（更快的盘天然提升 io_capacity 上限）。
- 参数服务于画像，画像来自指标——次序反了就是盲调。

## 案例

### 第三步发散·验证与推演 对照操作：读写分型与药方对照

- 教学验证：同一实例分别注入读密集（冷数据扫描）与写密集（批量更新）负载，各试加池与调 io_capacity。
- 预期：读密集加池命中提升、IO 下降。
- 写密集加池恶化、调 io_capacity 平缓刷新。
- 四组对照可复跑，分型诊断的价值立现。

### 第三步发散·追问① 追问：为什么 redo 大小影响写 IO 平滑度

- redo 太小时 checkpoint 频繁提前（保护 redo 空间），脏页被迫小批高频刷。
- redo 足够大让脏页刷新平摊在更长窗口——写 IO 曲线从锯齿变平缓。
- 8.4 的动态 redo 容量缓解了硬编码问题，但容量规划仍要按"最坏 1 分钟写入量"核算。

## 总结点

1. 池管读命中，不管写产出
2. 写 IO 调 io_capacity 与 redo
3. 先画像再调参，次序不能反
