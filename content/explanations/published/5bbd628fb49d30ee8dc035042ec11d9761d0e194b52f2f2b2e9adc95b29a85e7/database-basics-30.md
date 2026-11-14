<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Statement.html#setQueryTimeout(int))
- [github.com · 2](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银雪崩复盘沙盘:一条慢 SQL 挂住连接池 200 个连接——上游所有接口排队等连接(获取超时 30 秒默认),线程堆积,整个应用雪崩;两层超时(获取/执行)是隔离故障的堤坝。

1. 获取超时(connectionTimeout,池级):应用向池要连接的最大等待——不设(或默认 30s)时慢查询拖垮池,后续所有请求「等连接」而非「执行失败」——故障从一条 SQL 放大为全站不可用;设 1-3 秒:快速失败+降级,故障被隔离在受影响接口。
2. 执行超时:MySQL 侧 innodb_lock_wait_timeout(锁等待,默认 50s 建议降 2-5s)+max_execution_time(只限 SELECT);应用侧 socketTimeout(防 TCP 挂死)+queryTimeout——没有执行超时的查询会永久占用连接。
3. 组合与监控:池参数(最大连接数按 DB 容量,不是按应用数——多应用实例×大池=DB 连接耗尽,第 152 题舱壁同源)+泄漏检测(连接借出未归还告警,HikariCP leakDetectionThreshold);超时的语义=快速失败进入降级路径(返回缓存/默认值/明确错误),不是静默吞掉。

## 参考分析

### 机制:慢 SQL 如何级联成全站雪崩

传播链:慢查询占用连接(执行无超时)→池耗尽→新请求在「获取连接」上排队(获取无超时=等到线程池也堆满)→容器线程耗尽→连健康检查都失败→LB 摘除全实例;每一层缺超时都在放大故障半径——超时的本质=「故障单元的最小包围圈」:获取超时圈住等连接的请求,执行超时圈住慢查询,socketTimeout 圈住网络层;圈越小雪崩越难发生。

### 反例:超时缺失的三种事故

事故一:无 socketTimeout——网络分区(交换机抖动)后 TCP 半开连接永久占位,池悄悄漏光;事故二:锁等待 50s 默认——行锁冲突场景请求挂 50 秒,上游早已超时重试(第 27 题),重试进一步加锁=雪崩加速;降到 2-5s 快速失败。事故三:多应用共享 DB 无池上限协调——总连接超 max_connections,全部应用获取失败;连接预算分配(第 138 题舱壁)。

### 取舍:超时值的调优

获取超时=上游请求可接受延迟(1-3s,与接口 P99 对齐);锁等待 2-5s(冲突应快速失败重试);socketTimeout=最长合法查询+缓冲(60-120s,大报表另设通道);执行超时不是越小越好——误杀合法长查询(报表通道独立+专属池,第 24 题池隔离);每档超时都要配套降级动作,超时 without 降级=超时抛异常吓坏用户。

## 案例

### 验证:超时断言组(本机可复跑)

验证:获取超时断言(占满池,新请求在 connectionTimeout 处快速失败而非 30s);执行超时断言(锁等待场景 innodb_lock_wait_timeout=2s 快速失败);socketTimeout 断言(模拟网络挂起,读超时触发);泄漏断言(借出未还,leakDetection 告警日志);雪崩对照断言(无超时 vs 有超时的级联耗时分布——故障半径对比)。预期:每层超时独立可测。

### 追问链:超时三刀

一刀:超时预算的传递——总预算分解到 DB/下游各层(第 12 题 distributed 预算传递),DB 层超时=总预算的子集;二刀:池监控——活跃/等待/借出时长分布是池健康的仪表(第 49 题调度器监控同构);三刀:与熔断的组合——超时计数驱动熔断器(连续慢→OPEN,第 137 题 reliability),超时是熔断的信号源。

## 总结点

1. 获取超时圈故障半径
2. 锁等待降秒级,socketTimeout 防挂死
3. 超时必须配降级动作
