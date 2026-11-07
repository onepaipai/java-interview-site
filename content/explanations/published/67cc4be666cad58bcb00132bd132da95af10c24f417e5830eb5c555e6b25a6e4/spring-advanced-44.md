<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-ann-rest-exceptions.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/architecture.html)

</details>

## 参考回答

1. 对外返回稳定错误码、状态、必要字段提示与追踪标识，对内保留受控原因链；不暴露 SQL、路径、密钥或堆栈。
2. 根据调用者权限决定是否披露资源存在，未知错误用通用消息并保留服务端定位证据。

## 参考分析

1. 数据库原文、RejectedValue 和认证参数可能含秘密，日志同样要脱敏与访问控制。
2. 统一协议不意味着全部返回同一状态，不能用成功包装掩盖服务故障。

## 案例

1. 教学场景：唯一键冲突响应带表名和 SQL，登录失败日志打印整个请求体。

2. 定义外部错误 DTO，在参数、业务、持久化和安全边界分别映射并脱敏。

3. 验证响应无内部秘密，恶意文本不成为可执行 HTML，追踪号能关联受控根因。

## 总结点

1. 外部协议与内部原因分开。
2. 日志同样需要脱敏保护。
