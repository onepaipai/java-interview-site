<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 8446 · TLS 1.3 · 1](https://www.rfc-editor.org/rfc/rfc8446.html)
- [OWASP 交易授权 · 2](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

</details>

## 参考回答

1. 支持受控的新旧版本并行验证与切换，明确生效范围和回退，演练失败场景。
2. 密钥只在服务端受控保管，不进入日志和浏览器。

## 参考分析

1. 证书和密钥有不同使用目的与轮换窗口。
2. 新旧并存需由协议支持，不能任意尝试多个密钥后接受任一消息。

## 案例

1. 场景（教学示例）：渠道签名证书即将到期，计划切换公钥版本。

2. 处理：提前验证新链与算法，按受控 keyId 选择，灰度切换并保留旧验证窗口；失败有回退和告警。

3. 验证：合法回调不中断；过期或不受信密钥仍拒绝，日志不记录私钥。

## 总结点

1. 轮换先验兼容。
2. 密钥版本必须受控。
