<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

1. 先确定失败是否允许部分结果提交：整体失败时让异常跨过事务边界，或显式 setRollbackOnly；可恢复分支必须有明确业务含义。
2. catch 只改变控制流，不能保证事务仍可提交，也不能清除已设置的回滚状态；返回值需要如实表达最终结果。

## 参考分析

1. 方法内部吞掉异常，拦截器可能看不到失败；内层参与者已标记回滚时，外层即使正常返回也可能在提交时失败。
2. 不要统一捕获 Throwable 并返回成功；数据库连接故障等错误可能使继续执行本身不安全。

## 案例

1. 教学场景：先扣库存，写订单失败被 catch 后返回成功，出现无订单的库存扣减。

2. 将整个用例作为事务边界，定义失败异常与回滚规则；另为确实可忽略的附加动作定义独立恢复语义。

3. 验证事务结束后的订单和库存状态，覆盖异常穿出、内部吞异常及显式标记回滚三条路径。

## 总结点

1. 失败策略先于异常处理。
2. 提交结果不能靠返回值猜测。
