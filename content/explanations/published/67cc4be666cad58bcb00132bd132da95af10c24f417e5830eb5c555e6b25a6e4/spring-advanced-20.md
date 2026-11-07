<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/session-management.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-session/reference/)

</details>

## 参考回答

1. 将会话或安全版本放入共享可信存储，并让各节点恢复身份时按统一规则检查；只清一个节点内存不能撤销其他节点状态。
2. 明确缓存和复制的最长失效窗口，处理存储不可用策略；登录态、刷新凭证和长期凭证应一并纳入撤销协议。

## 参考分析

1. 单机 SessionRegistry 主要覆盖当前实例所知会话，不能凭存在该对象推断集群撤销成立。
2. 版本递增要与敏感账号修改协调；节点本地缓存若不失效，旧版本仍可能继续授权。

## 案例

1. 教学场景：A 节点禁用账号，浏览器随后被路由到 B 节点仍可操作。

2. 使用共享会话撤销或统一版本校验，在两个独立实例分别建立会话再执行撤销。

3. 验证每个旧会话在约定窗口内失效，含跨节点和缓存延迟路径；记录依赖故障时是否拒绝敏感请求。

## 总结点

1. 撤销状态必须跨节点可见。
2. 本地缓存失效窗口要明确。
