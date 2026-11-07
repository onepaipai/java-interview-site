<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [OWASP 日志安全 · 1](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [RFC 8446 · TLS 1.3 · 2](https://www.rfc-editor.org/rfc/rfc8446.html)

</details>

## 参考回答

1. 报文和解密材料可能包含令牌、账号及业务数据，应最小化采集并控制访问与保留。
2. 可优先采集元数据来缩小问题范围。

## 参考分析

1. 抓包可能包含 Cookie、令牌和明文业务数据，TLS 下也有可识别元信息。
2. 采集范围、保留和访问必须受控。

## 案例

1. 场景（教学示例）：排查测试请求却抓到其他用户连接。

2. 处理：在授权环境按目标与时段过滤，最少保留载荷，去除敏感字段并限制访问；用合成请求复现。

3. 验证：证据足够定位时序且不泄露无关凭证；共享前复查，不默认全量永久保存。

## 总结点

1. 抓包只取必要范围。
2. 排障证据也需保护。
