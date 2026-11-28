<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银渐变故障沙盘:上线后每天上午连接池等超时告警,重启恢复,次日复发——连接借出未归还(异常路径漏 close/事务未关闭)是慢性泄漏;池耗尽前有「活跃数缓慢爬升」的信号。

1. 泄漏的两种形态:①真泄漏——连接借出后从不归还(异常路径绕过 finally/手动连接忘 close/事务模板外用连接),活跃数单调增长不回落,直到池满;②伪泄漏——长事务/慢查询持有连接超久(归还慢,不是不还,第 20 题长事务)——区分两者:看借出时长分布(泄漏=趋向无穷,慢=集中在慢 SQL)。
2. 表现的时间线:日常正常→泄漏累积数小时→池满→获取超时(connectionTimeout 报错)→业务告警;监控三信号:活跃连接数趋势(爬升不回落=嫌疑)/借出时长(>N 秒占比)/获取等待队列(等待人数与时长)——泄漏的早期信号是「活跃数基线逐日抬升」。
3. 治理:①代码层——try-with-resources/事务模板,异常路径也归还;②池层——leakDetectionThreshold(借出超时打栈定位)+maxLifetime(防 DB 静默断连);③DB 层——processlist 的 Sleep 连接与池活跃数对账。

## 参考分析

### 第二步扩展① 机制:借出-归还契约为什么容易被破坏

- 连接的生命周期跨越业务代码(借出→SQL→归还)——归还责任在业务代码手上(框架托管后弱化,但手动连接/绕过框架的路径仍裸奔)。
- 异常路径是重灾区:try 块抛异常时 return 到池的语句被跳过——finally/try-with-resources 是唯一可靠归还(第 25 题 ThreadLocal finally remove 同构:资源借还都靠 finally 纪律)。
- 泄漏检测的本质=借出时打点+超时打栈,把「不还」显性化。

### 第二步扩展② 反例:泄漏的三种事故

- 事故一:异常路径漏 close——try 内 return 前抛异常,close 在 return 后(顺序错)。
- try-with-resources 修复。
- 事故二:事务模板外自取连接(多数据源场景)——事务不绑定,连接与事务都漏。
- 统一数据源访问层。
- 事故三:DB 侧 kill(超时连接被 DBA/防火墙掐)——应用不知道,继续用死连接报通讯异常。
- maxLifetime+testWhileIdle 保活。

### 第二步扩展③ 取舍:泄漏检测阈值与池大小

- leakDetection 设 60s(长事务豁免名单另管)——太短误报(报表),太长漏报。
- 池大小=DB 容量÷应用实例数(每实例 10-20 足够,第 152 题舱壁预算)。
- 泄漏不可 100% 预防,监控+快速定位(栈打点)让修复以小时计——「会漏但要能快速抓」是工程态度。

## 案例

### 第三步发散·验证与推演 验证:泄漏断言组(本机可复跑)

- 验证:泄漏复现断言(异常路径借出不还→活跃数爬升→获取超时。
- leakDetection 打出持有栈——定位到行)。
- 伪泄漏区分断言(慢事务持有时长分布 vs 泄漏的趋向无穷)。
- 归还断言(try-with-resources 异常路径仍归还——修复对照)。
- maxLifetime 断言(连接到期重建,防 DB 静默断连)。
- 对账断言(池活跃数 vs DB processlist 数一致)。
- 预期:泄漏-检测-修复闭环。

### 第三步发散·发散要点 追问链:池泄漏三刀

- **追问①**：与 ThreadLocal 泄漏的同构——借出资源+finally 归还纪律(第 25 题),框架托管减少裸奔;
- **追问②**：池与事务的绑定——Spring 事务的连接绑定与释放(@Transactional 的连接生命周期,第 89 题),泄漏常发生在「脱离模板」的路径;
- **追问③**：池参数族——maxLifetime/idleTimeout/minimumIdle 与连接有效性的探测开销(第 30 题超时参数族),池调优是系统工程不是单参数

## 总结点

1. 泄漏=借出不还,活跃数爬升是信号
2. try-with-resources 是唯一可靠归还
3. leakDetection 打栈定位到行
