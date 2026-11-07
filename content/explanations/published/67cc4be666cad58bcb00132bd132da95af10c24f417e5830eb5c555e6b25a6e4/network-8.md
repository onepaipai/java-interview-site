<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9293 · TCP · 1](https://www.rfc-editor.org/rfc/rfc9293.html)
- [RFC 9110 · HTTP 语义 · 2](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 前者是传输层的可选存活探测，后者表达复用连接承载多个请求。
2. 二者都不替代应用级超时与业务健康检查。

## 参考分析

1. HTTP 持久连接允许多个请求复用同一连接。
2. TCP keepalive 是传输层探测，不会替应用持续发 HTTP 业务请求。

## 案例

1. 场景（教学示例）：连接空闲后代理已清理，客户端仍认为池内连接可用。

2. 处理：核对双方空闲超时，设置连接寿命及必要探测；业务链路单独做就绪检查。

3. 验证：能识别陈旧连接，但 keepalive 成功不能证明鉴权与数据库可用。

## 总结点

1. 复用属于 HTTP 语义。
2. 探活不等于业务健康。
