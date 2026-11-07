<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-servlet.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. Controller 接收协议输入、绑定校验并组织响应；Service 负责业务用例、授权不变式与事务边界；Repository 封装持久化访问。
2. 分层按职责和变化原因划分，不要求每个简单查询都机械增加无意义的转发类。

## 参考分析

1. HTTP 状态和请求 DTO 变化不应迫使仓储理解浏览器协议；SQL 或存储替换也不应把事务规则散到控制器。
2. 跨多个写操作的原子性通常放在服务用例边界，数据库约束仍是并发下的重要保障。

## 案例

1. 教学场景：下单控制器直接扣库存、写订单和调用支付，失败分支散落且难以重用。

2. 把本地业务编排收进服务，仓储提供受控读写；控制器只做请求转换和成功、失败响应映射。

3. 验证绕过 HTTP 调用服务仍守住数量和权限约束；真实数据库故障可验证本地回滚，接口测试验证状态与错误体。

## 总结点

1. 协议、用例、存储分别负责。
2. 服务边界守住业务不变式。
