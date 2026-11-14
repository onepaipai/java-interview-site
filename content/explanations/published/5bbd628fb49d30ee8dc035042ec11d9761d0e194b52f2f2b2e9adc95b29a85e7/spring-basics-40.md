<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银容量沙盘:Tomcat 200 线程加 HikariCP 200 连接——每个请求占连接的时长只是请求的一部分——连接数等于并发数据库操作数非请求数。

1. 连接数的正确计算连接数等于并发数据库操作数等于 QPS 乘平均 DB 操作时长 Little 定律——请求线程 200 但并发 DB 操作可能只有 50 其余在应用层处理——连接池 50 加缓冲即够。
2. 过大的危害数据库端连接数乘实例数大于数据库 max_connections 数据库资源耗尽连接竞争数据库端锁与上下文切换连接不是越多越好数据库端有容量上限。
3. HikariCP 的推荐连接数等于核数乘 2 加有效磁盘数 PostgreSQL 公式——经验值较小实际值等于压测确定——经验值是起点压测是终值。

## 参考分析

### 机制:Little 定律与连接数计算

Little 定律:并发数=QPS×平均耗时。连接数=QPS×平均 DB 操作时长——请求线程 200 但并发 DB 操作可能只有 50(其余在应用层处理)——连接池 50+缓冲。过度分配:连接数=线程数(200)→数据库端 200 连接/实例×20 实例=4000 连接——数据库 max_connections(通常 500-1000)耗尽。

### 反例:连接数过大的资源竞争

沙盘:HikariCP 200 连接×10 实例=2000 数据库连接——数据库 max_connections=500→连接竞争→部分实例获取不到连接→启动失败或运行时超时。修复:连接数=数据库 max_connections/实例数-缓冲——全局视角的容量分配(banking 28 题 distributed)。

### 取舍:连接池的监控与调优

监控:活跃连接数/等待线程数/空闲连接数(HikariCP 指标)——等待线程>0=连接不足。调优:梯度压测(第 28 题 distributed)找拐点——连接数的终值由压测决定,经验值是起点。泄漏:leakDetectionThreshold 检测连接泄漏(未归还的连接告警)。

## 案例

### 验证:连接数的断言组

验证:Little 断言(QPS 乘 DB 操作时长等于需要的连接数实测验证);过载断言(连接数等于线程数数据库连接耗尽复现);压测校准断言(梯度压测找拐点连接数的终值)——三组固化连接数纪律(banking 28 题distributed 的容量估算同构)。

### 追问链:连接池三刀

一刀:连接池的监控活跃连接数等待线程数空闲连接数 HikariCP 的指标等待线程数大于 0 等于连接不足扩容或优化查询。二刀:连接池的泄漏连接未归还代码 bug 流未关闭事务未完成泄漏检测 HikariCP 的 leakDetectionThreshold 泄漏的告警。三刀:事务与连接的绑定事务期间连接被绑定事务开始获取提交释放事务时长等于连接占用时长。

## 总结点

1. 连接数等于并发 DB 操作数非线程数
2. 数据库端有容量上限
3. Little 定律计算压测校准
