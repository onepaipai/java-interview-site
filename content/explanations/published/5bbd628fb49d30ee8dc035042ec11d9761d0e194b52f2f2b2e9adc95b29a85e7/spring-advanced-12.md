<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账沙盘:一个 300 行的 service 方法只有 30 行需要事务,整方法 @Transactional 导致长事务(连接占用放大,第 2 题)。用实测过的模板写法说明"边界显式化"的重构路径。

1. TransactionTemplate 把事务边界写成代码块:边界在哪儿、包了什么、传播级别是什么,全部可见可审——自调用失效(第 1 题)与边界过宽(第 2 题)同时消失。
2. 本机真值示例即模板写法:外层 REQUIRED 包全部,内层 NESTED 保存点包单行——两层边界一目了然(输出 [1]:[2])。
3. 适用边界:边界复杂或与业务流不一致的场景;简单的"方法级全事务"仍用注解,不为炫技换模板。

## 参考分析

### 机制:模板与注解的同源差异

注解事务的边界=代理拦截的方法粒度;模板的边界=代码块粒度,且模板实例可显式配置传播级别与隔离级别。两者最终都走同一个 PlatformTransactionManager。模板的三个工程优势:边界与业务流精确对齐(30 行里只包 10 行)、传播行为在构造处可见(不用翻注解)、在同类内部可嵌套使用(无代理绕行问题)。代价:回调嵌套深时缩进难看、忘了模板实例的传播配置会默认 REQUIRED。

### 实证:真值示例的两层边界

本机编译执行的真值示例(第 3 题,NEXTED 保存点)展示模板的两层边界:外层 TransactionTemplate(REQUIRED)包整批,内层 TransactionTemplate(NESTED)包单行,内层失败外层继续:
```
执行结果 [1]:[2](内层行随保存点回滚,外层行提交)
```
同款写法用于对账重构:整批事务只包"读文件+逐行处理+汇总",行级补偿用内层模板——连接占用从"整方法时长"降到"整批必要时长",与第 2 题的连接账本直接对应。

### 取舍:模板化的重构步骤

第一步,量边界:日志或micrometer 量当前事务方法时长,找出"事务时长/方法时长"比值低的(边界过宽)。第二步,拆:把需要事务的代码块提为方法或 lambda,包进模板;模板实例按传播需求预配置(命名如 nestedTemplate、newTxTemplate)。第三步,验证:第 4 题的 rollback-only 用例与数据断言照搬到 CI。禁忌:把模板与注解在同一调用链混用而不清楚谁包谁——画一层调用图再动手。

## 案例

### 验证:重构前后各打印事务边界日志(开 TRACE 看 Partic

验证:重构前后各打印事务边界日志(开 TRACE 看 Participating/Creating new transaction 行),确认模板边界与设计一致;再用第 2 题的连接计数对比事务时长,收益(连接占用下降)以数字进评审。

### 追问链:模板三刀

一刀:"模板要做成单例吗?"——是:TransactionTemplate 线程安全,按传播级别预配置成若干命名 bean 注入使用;每次 new 配置散落且易错。二刀:"模板里抛 checked 异常会回滚吗?"——execute 的回调异常由 rollbackOnException 按默认规则(RuntimeException/Error 回滚,checked 默认不回滚)判断后原样传播,不会统一包装为 TransactionException;checked 异常需 setRollbackOnly 显式标记,与注解规则一致(第 5 题)。三刀:"与注解的边界重叠怎么排查?"——嵌套时按传播规则合并(REQUIRED 参与外层),日志开 TRACE 看"Participating transaction/Creating new transaction"——实际边界以日志为准,不以想象为准。

## 总结点

1. 边界写成代码块,可见可审
2. 模板实例预配置,命名注入
3. 复杂边界用模板,简单仍用注解
