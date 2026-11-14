<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银双库沙盘:账务库与渠道库各一个 DataSource,@Transactional 默认拿走"唯一"的事务管理器,渠道写入跑到账务管理器上——事务开着,渠道库裸奔。用计数实验说明绑定错误与显式化方案。

1. 多个 TransactionManager 时,@Transactional 不指定 qualifier 就会按"主/唯一"解析,选错即"有事务没防护"——最难排查的失效形态。
2. 实测思路:给每个 DataSource 包一层连接计数器(第 2 题的 DelegatingDataSource),事务执行期间哪个库新建了连接,事务管理器就绑定了哪个库——绑定错误立刻显形。
3. 工程化方案:@Transactional("channelTxManager") 显式限定,或按包路径分配置(事务管理器的 advice 链),或干脆 TransactionTemplate 各持一个实例。

## 参考分析

### 机制:管理器解析与绑定错误的显形

@Transactional 的解析:注解 qualifier 优先;否则容器里唯一的事务管理器;多个时取 primary;都没有则异常。选错的后果形态:事务开关正常(日志有 BEGIN/COMMIT),但连接来自另一个库——业务库上没有任何事务。显形手段即计数:DelegatingDataSource 统计各库在事务期间的新建连接(本机第 2 题实验同构:REQUIRED=1、REQUIRES_NEW=2 的计数方法),把"事务管着谁"变成可观测事实。

### 推演:双库选错的连接计数画像(附本机计数方法证据)

画像推演:正确绑定渠道管理器时,事务期间渠道库连接计数+1、账务库 0;选错时账务库+1、渠道库 0——对照即错。本机证据(第 2 题实验):DelegatingDataSource 计数可靠区分"哪个事务管理器取了哪个库的连接"(REQUIRED=1、REQUIRES_NEW=2 的差值即内层连接),方法直接迁移到多数据源审计。验证:双库环境各包计数器跑一次业务流,数字对不上绑定即错;本机未搭双库,标注推演。

### 取舍:显式化的三种落地

方案一,qualifier:@Transactional(transactionManager = "channelTxManager")——显式但散落在每个注解,漏写即回退到"主管理器",要配 ArchUnit 检查(渠道包内注解必须带限定符)。方案二,按包分配置:TransactionInterceptor 按切面表达式绑定,业务代码零感知——集中,但"包路径即库"的约定要文档化。方案三,TransactionTemplate 按库各建实例(账务模板/渠道模板)——边界最显式(第 12 题),适合库访问集中的模块。混合常见:核心资金路径用模板,一般路径用 qualifier。

## 案例

### 验证:给每个 DataSource 包一层连接计数器(Delega

验证:给每个 DataSource 包一层连接计数器(DelegatingDataSource),事务执行期间哪个库新建了连接,管理器就绑定了哪个库——双库各打印计数,与预期绑定不符即选错;再在 CI 加"每个库一条事务存在性冒烟用例"。

### 追问链:多数据源三刀

一刀:"两个库的事务能合成一个吗?"——同一 JVM 内多个 DataSource 的"全局事务"需要 JTA/Atomikos 类事务管理器(2PC,分布式 10 题的代价);更常见的选择是放弃跨库事务,用 outbox+对账(分布式 14 题)。二刀:"读写分离的路由数据源怎么配事务?"——路由 DataSource 在事务开始时确定目标,事务内固定;读写分离加事务要保证"事务读主",路由策略必须感知事务上下文,否则事务里读到从库旧值。三刀:"测试里怎么防选错?"——测试配置里给每个管理器不同的名字并对每个库各写一条"事务存在性"冒烟用例(事务中插入、另一个连接查不到)——把绑定错误挡在 CI。

## 总结点

1. 多管理器必显式,qualifier 或模板
2. 计数显形:事务到底管着谁
3. 跨库事务不硬合,outbox 兜
