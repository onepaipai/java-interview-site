<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银支付沙盘:支付成功后发卡券,团队把监听器写成普通 @EventListener(事务一提交前就跑)或默认 AFTER_COMMIT 后又疑惑"为什么测试里不触发"。用后端真实执行的事务监听测试说明四个阶段的选择规则。

1. 四阶段:AFTER_COMMIT(默认,提交后执行)、AFTER_ROLLBACK、AFTER_COMPLETION(两者都走)、BEFORE_COMMIT(事务内,可参与写)。选型=该动作与事务成败的绑定关系。
2. 真实执行证据(本仓库测试):提交后监听器在事务提交后才收到事件(事务内发布时 committed 列表为空),回滚事务不触发 AFTER_COMMIT,无事务发布默认不触发(fallbackExecution=false)。
3. 两个最常错:默认阶段在无事务时不执行(测试环境单步调用没开事务→监听器"失踪");BEFORE_COMMIT 里做重活拖长事务(第 16 题竞态同源)。

## 参考分析

### 第二步扩展① 机制:阶段与事务生命周期的绑定

- 发布事件时若存在活动事务,监听按 phase 挂到事务同步器:BEFORE_COMMIT 在提交前执行(仍可写库,参与同一事务)。
- AFTER_COMMIT 在提交成功后执行(新连接,主事务已终)。
- AFTER_ROLLBACK 对应回滚。
- AFTER_COMPLETION 无论如何都执行。
- 无活动事务时默认不执行(fallbackExecution=false),这就是"测试里监听器不跑"的标准答案。
- 本仓库的真实测试断言了完整行为:提交后 committed=[1],回滚后不追加,无事务发布不触发,AFTER_COMMIT 内监听器抛异常不影响已提交数据。

### 第二步扩展② 实证:仓库真值测试的阶段矩阵

- 本仓库后端测试(SpringAdvancedExamplesTest,真实 Spring 上下文 + H2)对四类情形的断言:
```
事务内发布 → 提交前列表为空,提交后 = [1]
事务回滚 → 监听器不执行(列表不变)
无事务发布 → 不触发
AFTER_COMMIT 监听器抛异常 → 不影响已提交数据
```
- 验证:该测试随每次后端构建真实执行,阶段语义以它为准。
- 这是"引用真实执行证据"的最佳来源——写业务监听器时对照这四条。

### 第二步扩展③ 取舍:按业务绑定的选择表

- 发卡券/发短信(主事务成功才该发生):AFTER_COMMIT——主事务回滚则不发生,天然一致。
- 审计留痕(成败都要记):AFTER_COMPLETION 按 status 分支。
- 事务内校验/修正(失败要阻止提交):BEFORE_COMMIT,但要轻(拖长事务,第 2 题连接占用)。
- 补偿类(回滚后清理):AFTER_ROLLBACK。
- 注意 AFTER_COMMIT 里的数据库操作不在原事务:要么开新短事务(@Transactional(REQUIRES_NEW) 或模板),要么接受其独立成败并对账(第 11 题)。

## 案例

### 第三步发散·验证与推演 验证:按本仓库真值测试的四断言形态(提交前列表为空、提交后追加、回

- 验证:按本仓库真值测试的四断言形态(提交前列表为空、提交后追加、回滚不触发、无事务不触发)为每个业务监听器建用例——阶段语义锁进 CI,而不是靠日志肉眼确认。
- 补充:监听器内不做重业务,重活转任务表。
- 用例覆盖四个阶段的矩阵,任何阶段配置错误在 CI 直接暴露。

### 第三步发散·追问扩展 追问链:事件阶段三刀

- **Q1：AFTER_COMMIT 里抛异常会怎样?**
  - 答：不会回滚主事务(已提交);默认被日志吞掉,业务要感知失败就得在监听器内自行重试/落补偿表(第 10 题专论)。
- **Q2：事件在多实例下会重复吗?**
  - 答：Spring 事件是进程内的:多实例各自发布各自处理,不跨实例;跨实例要消息队列(第 30 题)——"进程内事件当跨服务消息用"是高频架构错误。
- **Q3：监听器能拿到事务里的写入吗?**
  - 答：AFTER_COMMIT 阶段原事务已提交,新连接能看到;BEFORE_COMMIT 能看到未提交数据(同连接)——两个阶段的可见性不同,设计查询类监听器时要注意。

## 总结点

1. 阶段即绑定:成功才做选 AFTER_COMMIT
2. 无事务默认不跑,测试要开真事务
3. 提交后写库是新事务,要幂等
