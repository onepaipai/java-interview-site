<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)
- [RFC 9110 · HTTP 语义 · 2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

</details>

## 参考回答

1. 数据库、文件或远程扣款可能已成功，随后响应失败；重试整个入口会重复执行，异常不能证明之前没有成功。
2. 围绕稳定业务键和状态查询设计幂等用例，限定可重试错误、次数和总时间；本地回滚不撤销已完成远程动作。

## 参考分析

1. 幂等键要校验请求内容一致并处理并发，先查再写仍有竞争，需约束或原子领取。
2. 远端超时是结果未知，优先核对状态；不幂等操作盲重试会扩大故障。

## 案例

1. 教学场景：扣款成功后响应失败，客户端重试下单再次扣款。

2. 持久化稳定请求键和处理状态，对端按同业务键处理或提供核对接口，逐个注入失败窗口。

3. 验证并发重试只有一个业务结果，冲突内容被拒绝，未知状态可恢复。

## 总结点

1. 报错仍可能已产生副作用。
2. 重试围绕幂等与状态核对。
