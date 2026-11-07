<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

1. 注解需由启用的事务基础设施处理，调用还需经过支持的代理边界；普通 new、自调用和不适用的方法可能绕过增强。
2. 即使增强生效，REQUIRED 也可能加入已有事务，SUPPORTS 等传播不一定创建新事务；还应确认管理器和实际数据源对应。

## 参考分析

1. 没有新事务与完全没有事务是不同结论；自调用也可能继续处于外层已存在的事务中。
2. 事务状态日志需结合连接、传播方式和提交后的数据观察，不能只凭注解或类名判断。

## 案例

1. 教学场景：外层事务调用另一 Bean 的 REQUIRED 方法，开发者以为每个注解都会取得独立连接。

2. 记录调用路径与管理器，比较无外层调用、加入外层和显式 REQUIRES_NEW 三种路径。

3. 验证实际连接和最终回滚行为；另测自调用，说明增强缺失和正常加入外层并非同一问题。

## 总结点

1. 有注解不等于穿过增强。
2. 加入已有事务不等于新建。
