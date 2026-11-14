<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银转账沙盘:方法里 try-catch 了业务异常又想回滚,团队在"重新抛出""setRollbackOnly""抛新的运行时异常"之间随意选。给出捕获后的决策规则与各自的语义后果。

1. 默认规则:RuntimeException 与 Error 触发回滚,checked 异常不触发(rollbackFor 可改)——捕获了异常,事务管理器就"看不到"它。
2. 捕获后的三个合法选项:重新抛出(让规则生效)、显式 setRollbackOnly(不抛但要回滚)、确认可安全继续(部分失败可容忍,如批量逐行容错)。
3. 错误选项:吞掉后假装成功(第 4 题的 rollback-only 炸弹),或"抛一个 checked 异常期望回滚"(默认不回滚,必须 rollbackFor)。

## 参考分析

### 机制:回滚决策的三个信息源

事务管理器决定回滚时只看三样:方法边界抛出的异常类型(与 rollbackFor/noRollbackFor 规则匹配)、事务状态上的 rollback-only 标记、以及底层连接的错误。方法内部捕获异常后,前两个信息源都拿不到它——"捕获即隐身"。setRollbackOnly 是显式补上信息源的方式:状态标记先行,提交点必然回滚,与是否再抛异常无关。批量场景的"逐行捕获继续"必须配合整体决策:最后汇总失败率决定 setRollbackOnly 或提交。

### 反例:吞掉与误抛的两类事故

事故一(吞):扣款失败被 catch 后 return true,账户状态显示成功——资金错误,比抛异常严重得多(第 3 题分布式 3 的"错误的成功")。事故二(误抛):catch SQLException 后包装成 Exception(checked)再抛,期望回滚——默认规则不回滚 checked,半截数据提交。修正:包装异常时保持 rollback 语义(继承 RuntimeException 或加 rollbackFor);代码评审问句:"这个 catch 之后,事务的预期终态是什么?"答不上即缺陷。

### 取舍:批量容错的回滚策略

策略一,全有全无:任何一行失败即 setRollbackOnly+整体失败——简单,适合强一致导入。策略二,分批提交:每 N 行一个事务,失败批次重试与死信(分布式 13 题纪律)——吞吐好,部分成功要业务可解释。策略三,NESTED 逐行保存点(第 3 题):单行回滚不弃整批——最灵活,保存点有成本。选择依据是"部分成功的业务语义":能解释就能用二或三;不能解释就一。

## 案例

### 验证:按本条推演的决策树写断言用例

验证:按本条推演的决策树写断言用例——捕获路径显式 setRollbackOnly 后断言数据 0 行,重抛路径断言整体回滚且异常类型正确;两用例进回归集,回滚语义以数据库行数为准。

### 推演:决策树的验证方式(附本机 rollback-only 证据)

决策树:捕获异常→业务可继续?→否:setRollbackOnly 或重抛;→是:记录失败明细+汇总,终态前 setRollbackOnly(超阈值)或正常提交(附失败清单)。验证:本机 Q4 实验(rollback-only 提交抛 UnexpectedRollbackException,数据全回滚)证明"吞掉无效";setRollbackOnly 路径可用同程序把 catch 内改为 status.setRollbackOnly() 复验——提交异常变为预期回滚,数据 0 行(推演标注,机制同源)。

### 追问链:回滚决策三刀

一刀:"rollbackFor = Exception.class 是好实践吗?"——把 checked 也回滚会让"预期内的业务失败"(如余额不足的专用 checked 异常)也炸掉整个事务,通常应该为它标注 noRollbackFor 或改设计;全局宽松回滚掩盖状态机问题。二刀:"捕获后不抛但 setRollbackOnly,上层怎么知道失败?"——返回值/状态对象必须表达失败;事务回滚了但方法返回 true 是新的"错误的成功"(第 3 题分布式)。三刀:"TransactionSynchronization 能感知回滚吗?"——能:afterCompletion(int status) 收到 STATUS_ROLLED_BACK,清理类逻辑挂这里而不是猜。

## 总结点

1. 捕获即隐身,回滚要显式
2. 三个选项:重抛/标记/确认继续
3. 批量容错先解释部分成功
