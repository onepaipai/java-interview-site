<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银事务沙盘:@Transactional 的 7 种传播行为(REQUIRED/REQUIRES_NEW/NESTED/SUPPORTS/NOT_SUPPORTED/MANDATORY/NEVER)——最常用的三种(REQUIRED/REQUIRES_NEW/NESTED)与连接占用差异(spring-advanced 2/3 题)。

1. REQUIRED(默认):有事务则加入,无则新建——最常用(大部分操作都在同一事务);REQUIRES_NEW:挂起当前事务,新建独立事务(两连接,外层等内层完成)——审计/通知"无论主事务成败都留痕";NESTED:保存点(内层回滚不影响外层,同一连接)——"部分回滚"(批量导入的单行失败,第 3 题 spring-advanced)。
2. 其他四种:SUPPORTS(有则加入无则非事务运行)/NOT_SUPPORTED(挂起当前,非事务运行)/MANDATORY(必须有事务否则异常)/NEVER(必须无事务否则异常)——低频使用(边界控制)。
3. 连接占用:REQUIRED=1 连接(内外共用);REQUIRES_NEW=2 连接(外层+内层各持一连接——池容量=并发×2);NESTED=1 连接(保存点,不额外占池)——REQUIRES_NEW 的连接翻倍是池耗尽的常见原因(spring-advanced 2 题实测:REQUIRED=1,REQUIRES_NEW=2)。

## 参考分析

### 机制:REQUIRES_NEW 的挂起模型

挂起=把外层的 ConnectionHolder 从 ThreadLocal 解绑(连接仍被外层持有,不归还池)→从池取新连接给内层→内层独立提交/回滚→解绑内层→恢复外层(重新绑定)——挂起的代价=连接翻倍+外层锁持有时间被内层放大(spring-advanced 2 题的精确化)。

### 反例:传播行为的两种事故

事故一:REQUIRES_NEW 的连接互等死锁——外层锁了行 A,内层(REQUIRES_NEW)也要更新行 A→外层持锁等内层,内层等外层释放行 A→死锁(spring-advanced 2 题的"自己等自己");修复=内层不访问外层已锁定的行。事故二:rollback-only 异常——内层(REQUIRED)标记 rollback-only,外层提交时 UnexpectedRollbackException(内层吞了异常但标记了回滚);修复=内层异常要么传播要么 catch 后不标 rollback-only。

### 取舍:传播行为的选型

默认 REQUIRED(大多数场景);审计/通知→REQUIRES_NEW 或 AFTER_COMMIT 事件(第 91 题);批量导入部分回滚→NESTED(保存点);边界控制→MANDATORY/NEVER(强制约束);Spring Data Repository 的查询→SUPPORTS(可事务可不事务)。

## 案例

### 验证:传播行为的走查核对

验证:spring-advanced 2 题实验(计数 DataSource:REQUIRED=1,REQUIRES_NEW=2)+3 题实验(NESTED 保存点:[1]:[2] 外层保住)+4 题实验(rollback-only:true:0 双行全回滚)——三组实测固化传播行为;第 19 题 spring-advanced 安全上下文(DelegatingSecurityContextCallable)。验证:传播行为断言可程序化(事务边界日志)。

### 追问链:传播三刀

一刀:"REQUIRES_NEW 内层访问外层未提交数据?"——另一个连接看不到未提交数据(隔离级别)→读到旧值或锁等待——"看不到自己刚写的数"是 REQUIRES_NEW 的常见坑(spring-advanced 2 题)。二刀:"NESTED 与保存点?"——DataSourceTransactionManager 支持 JDBC 保存点;JPATransactionManager 不支持(用 REQUIRES_NEW 替代)——事务管理器的实现决定 NESTED 是否可用。三刀:"传播与代理?"——传播行为由 TransactionInterceptor 根据注解读取并传给 PlatformTransactionManager——自调用绕过代理(第 87 题)→传播行为也不生效。

## 总结点

1. REQUIRED 默认,REQUIRES_NEW 独立
2. NESTED 保存点,连接不翻倍
3. REQUIRES_NEW 连接×2,池耗尽常见原因
