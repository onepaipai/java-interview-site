<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银转账沙盘:@Transactional 默认只回滚 RuntimeException 与 Error——checked 异常(如自定义 ValidationException extends Exception)不回滚——半截数据提交。rollbackFor=Exception.class 全覆盖或精确控制。

1. 默认规则:RuntimeException+Error→回滚;checked Exception(非 RuntimeException 的 Exception 子类)→不回滚——checked 异常抛出后事务照常提交(半截数据)。
2. 局限三:一是 checked 不回滚(需 rollbackFor);二是 noRollbackFor 的粒度(精确到类,不能按条件);三是私有方法/非 public 方法不生效(第 6 题 spring-advanced)。
3. 正解:rollbackFor=Exception.class(全回滚)+noRollbackFor 精确排除(业务上不需要回滚的 checked)——或者统一用 RuntimeException(业务异常继承 RuntimeException,第 11 题 java-language)。

## 参考分析

### 第二步扩展① 机制:默认回滚规则

- RuntimeException/Error→回滚(程序缺陷或不可恢复)。
- checked→不回滚(调用方应该处理)——规则的设计意图与实际效果的差距。
- 落地纪律:业务异常继承 RuntimeException 或显式 rollbackFor,不依赖对默认规则的记忆。

### 第二步扩展② 反例:checked 不回滚的后果

- ValidationException extends Exception→抛出后事务提交——半截数据入库(资金风险)。
- 验证:本机 H2 实测 checked 抛出后行数仍为 1,补 rollbackFor 后回滚为 0——规则靠断言固化。

### 第二步扩展③ 取舍:rollbackFor 的策略

- 统一 RuntimeException(业务异常继承运行时)或 rollbackFor=Exception.class(全回滚)+noRollbackFor 精确排除。

## 案例

### 第三步发散·验证与推演 验证:回滚规则的断言组

- 验证:checked 不回滚断言(抛 checked 异常,数据已提交——复现)。
- rollbackFor 断言(rollbackFor=Exception.class 后 checked 也回滚)。
- noRollbackFor 断言(noRollbackFor 的异常不回滚)——三组固化回滚规则。

### 第三步发散·追问扩展 追问链:回滚三刀

- **Q1：异常嵌套的回滚?**
  - 答：内层抛 RuntimeException 被外层 catch——rollback-only 标记已设(spring-advanced 4 题)——外层提交抛 UnexpectedRollbackException。
- **Q2：readOnly 的效果?**
  - 答：readOnly=true 是提示(Hibernate flush 模式/驱动优化)——非硬约束(不阻止写入,第 13 题)。
- **Q3：事务的传播行为?**
  - 答：REQUIRED(参与/新建)/REQUIRES_NEW(独立)/NESTED(保存点)/SUPPORTS/NOT_SUPPORTED/MANDATORY/NEVER——七种传播的语义与连接占用(第 2 题 spring-advanced)。

## 总结点

1. 默认只回滚 RuntimeException
2. checked 异常默认提交
3. rollbackFor 全覆盖或精确排除
