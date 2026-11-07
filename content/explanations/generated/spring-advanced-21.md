<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/method-security.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/session-management.html)

</details>

## 参考回答

1. 数据库角色已经收回，旧权限缓存仍可能放行；账号修改完成不等于所有节点的授权决策已经更新。
2. 使用可校验权限版本、受控过期或可靠失效机制，并定义撤销时效；资源归属缓存也要纳入范围。

## 参考分析

1. 如果缓存直接保存完整 Authentication，角色修改未必自动刷新已有会话；应明确身份恢复和再授权策略。
2. 高风险操作可要求读取较新的权威状态，不能靠无限延长缓存换取可用性后仍宣称即时撤销。

## 案例

1. 教学场景：管理员移除导出权限，用户旧会话在另一个节点仍能导出。

2. 模拟权限修改、通知延迟与缓存不可用，检查每条授权路径的版本和过期规则。

3. 验证旧权限在约定窗口内失效，合法权限不被错误扩大，日志可定位节点采用了哪个版本。

## 总结点

1. 账号修改需同步授权缓存策略。
2. 撤销承诺用时间窗口验收。
