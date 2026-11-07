<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 8446 · TLS 1.3 · 1](https://www.rfc-editor.org/rfc/rfc8446.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 握手只验证到某个 TLS 终结点的传输建立，后端依赖仍可能失败。
2. 监控应区分连接、协议、服务与业务成功率。

## 参考分析

1. TLS 握手发生在业务处理之前。
2. 路由、鉴权、线程池与数据库可能在握手后独立失败。

## 案例

1. 场景（教学示例）：端口探测和 TLS 成功，但转账查询持续 503。

2. 处理：用无副作用就绪请求检查必要依赖，分阶段记录握手与业务耗时。

3. 验证：监控能区分证书故障与数据库故障；握手成功不再误报全链健康。

## 总结点

1. 握手只验传输阶段。
2. 健康要看业务必需依赖。
