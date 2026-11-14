<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账务测试沙盘:@Transactional 测试里一切断言通过,上线后"提交后数据丢失"——测试事务回滚掩盖了:提交后回调(afterCommit)不触发、REQUIRES_NEW 的独立提交、连接池行为差异。说明测试事务的三类盲区。

1. 盲区一,事务回调:@Transactional 测试回滚,afterCommit 监听/回调在测试中永不触发——提交后逻辑(第 9-11 题)在测试里零覆盖。
2. 盲区二,独立事务:REQUIRES_NEW 内层在测试中真实提交(独立于回滚的测试事务),测试数据污染+行为断言失真——"测试里能看到"不等于"提交路径正确"。
3. 盲区三,提交路径本身:批量提交、锁等待、约束延迟检查——只有真提交才走到;对策:关键路径用非事务测试(真提交+清理),事务回调测试按仓库真值测试范本(真提交后断言)。

## 参考分析

### 机制:测试事务的语义与三类盲区

@Transactional 测试:每个测试方法包在事务里,结束回滚——数据不残留,速度快。代价:事务语义与生产不同。盲区一:afterCommit 阶段依赖"真实提交事件",回滚测试里它不存在——第 9-11 题的逻辑在测试里表现为"永远不执行",团队误以为代码没被调用或干脆删掉。盲区二:REQUIRES_NEW 用新连接真提交,测试结束回滚只回滚外层——内层提交的数据留在库里(污染+误导)。盲区三:提交时才执行的数据库行为(延迟约束、外键检查时机、批量优化)在回滚路径上不存在。

### 实证:仓库真值测试的对照形态

本仓库后端测试(SpringAdvancedExamplesTest)明确注释"无自动测试事务:这些模板在断言前真实完成"——用 TransactionTemplate 真提交,断言 afterCommit 监听器行为:
```
提交后 committed=[1]
回滚路径 → 不追加
AFTER_COMMIT 异常 → 数据保留
```
解读:这组测试若改用 @Transactional 测试事务,afterCommit 断言全部失效——真提交是验证提交后语义的前提。验证:该测试随构建真实执行,是"测试事务盲区"的直接反例示范。

### 取舍:测试事务的适用边界

适用:纯业务逻辑单元(不含提交后回调/独立事务/数据库提交行为)、需要数据隔离的批量测试。不适用:事务边界本身是被测对象(传播/回调/提交)、数据写路径的端到端验证。替代方案:TestTransaction 编程式控制(测试内显式 commit 验证提交后行为)、非事务集成测试+数据清理(@Sql 清表/ByName 清理器)、Testcontainers 真库(第 39 题)。判定问句:被测行为是否发生在"提交之后或提交路径上"?——是则禁止测试事务。

## 案例

### 验证:grep 测试代码中 @Transactional 测试类,

验证:grep 测试代码中 @Transactional 测试类,标注含 afterCommit/REQUIRES_NEW/TransactionSynchronization 引用的高危清单,逐个改造为真提交测试——盲区清单清零为验收。

### 追问链:测试事务三刀

一刀:"REQUIRES_NEW 在测试里怎么处理?"——内层真提交污染库:测试配置把内层管理器指向同一测试事务(默认做不到)或测试后显式清理内层表;更清晰的是这类路径用独立真库测试。二刀:"怎么审计团队里的事务测试滥用?"——扫描 @Transactional 测试类,标注其中含 afterCommit/REQUIRES_NEW/TransactionSynchronization 引用的——盲区高危清单,逐个改造。三刀:"数据清理策略?"——真提交测试用表级清理(DELETE)而非 truncate(锁),清理逻辑放基类 finally;并行测试时按库隔离(H2 命名库,本机实验即 sa1/ro1/tx1 分库)。

## 总结点

1. 测试回滚掩盖提交盲区
2. 回调与独立事务,真提交才测得准
3. 提交后语义禁止用测试事务
