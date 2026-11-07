<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. Cookie 是浏览器存取与发送状态的机制，Session 通常保存服务端会话状态。
2. 多节点可共享会话存储，或使用带撤销机制的令牌方案。
3. 登录换会话标识，改密撤销旧会话，Cookie 设置 Secure、HttpOnly、SameSite。

## 参考分析

1. SameSite 不是所有部署形态的完整防线。
2. 转发头只信受控代理。
3. 抓包和日志需去除凭证及敏感载荷。

## 案例

1. 场景（教学示例）：反向代理终结 HTTPS，应用误设不安全 Cookie。
2. 处理：正确配置可信代理与原协议识别，验证 Secure、HttpOnly、SameSite 和 CSRF，限制源站直连。

3. 验证：会话在合法路径工作，跨站伪造写入被拒绝；日志不暴露令牌。

## 总结点

1. Cookie 属性分工。
2. 代理身份须受控。
