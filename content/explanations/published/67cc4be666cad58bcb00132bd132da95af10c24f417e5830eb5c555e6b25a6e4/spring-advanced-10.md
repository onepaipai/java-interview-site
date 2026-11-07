<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/transaction/support/TransactionSynchronization.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/transaction/event/TransactionPhase.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Spring 6.2 / JDBC 教学设计：订单已提交，后续通知回调抛出异常。分别比较 TransactionSynchronization.afterCommit、事务事件 AFTER_COMMIT 以及异步任务的错误去向。

1. 不会。物理事务已经成功提交，后续监听失败不能把它变回未提交；必须分别判断业务已落库和通知是否成功。
2. 直接 afterCommit 同步回调的运行时异常可传播给提交调用者；事务事件 AFTER_COMMIT 属于 afterCompletion 处理阶段，不能直接照搬这种传播结论，相关错误通常由完成回调记录。
3. 异步监听的异常又在工作线程或异步结果上观察。关键通知应持久化并重试，接口收到错误也不能直接重试整个创建动作。

## 参考分析

### 持久事实：提交后故障不倒转原交易

数据库提交成功后，事务管理器不能因为通知异常再对原事务执行有效回滚。客户端可能因其他路径看到错误或超时，此时订单仍可能存在。故障处理应能按稳定业务号查询状态，通知记录也应表达待发送或失败；若需要撤销业务，只能执行另一个有明确规则的补偿动作。类比合同公证完成后的送达通知失败：合同（提交事实）已生效，通知失败是物流问题——用登记册与重试补通知，而不是撕合同。

### 回调机制：相似名称不意味着相同异常契约

TransactionSynchronization.afterCommit 的文档允许运行时异常传播到调用者，原事务仍已提交。TransactionPhase.AFTER_COMMIT 则明确是 afterCompletion 的特化阶段，并不通过那个 afterCommit 方法执行；完成回调的异常处理规则不同。具体管理器和监听适配器还需核对，不能把所有“提交后”概念混用。

### 恢复边界：错误观察和可靠交付分别建设

同步错误可由提交调用路径观察，异步错误需收集 Future 或异常处理器；这些只解决看见失败，不提供重启后补发。重要通知应从已持久化任务恢复，并以业务事件标识幂等执行。监控要同时呈现订单提交率、通知积压和重试结果，不能只看 HTTP 状态判断订单最终状态。

## 案例

### 对照矩阵：三种监听路径分别执行

在隔离库创建订单并让三种监听路径分别失败，记录调用方异常、完成日志、异步异常及事务结束后的数据库行数。预期三条路径都不撤销已经提交的订单，但错误暴露位置不同。测试应保留具体 Spring 版本和管理器，不能只写一个抛异常的伪监听器就声称验证了事务事件机制。

### 重试追问：客户端看到失败却已下单

使用同一个业务幂等键重发请求，先查询或复用原订单结果，避免重复创建；通知单独恢复投递。再测试对端通知成功、本地确认失败时的重复窗口。预期订单不重复、通知按协议去重、失败记录可定位。上述是教学验收步骤，未把文档中的异常契约当作任意部署的实际执行记录。

## 总结点

1. 合同已公证，通知失败走补寄
2. 提交事实与通知结果分开
3. 不同提交后机制异常契约不同
4. 失败重试围绕幂等业务键
