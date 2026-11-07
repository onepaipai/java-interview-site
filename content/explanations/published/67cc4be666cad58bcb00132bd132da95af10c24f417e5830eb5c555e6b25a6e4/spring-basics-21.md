<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/authorize-http-requests.html)

</details>

## 参考回答

1. 认证验证请求者身份或凭证，并建立 Authentication；授权根据身份、权限、资源和动作决定是否允许访问。
2. 登录成功只证明通过某种认证，不等于能读取任意订单；入口规则和服务内对象授权要共同覆盖调用路径。

## 参考分析

1. 请求级规则可限制某路径角色，方法或领域校验进一步检查订单归属；仅靠前端隐藏按钮无法保护接口。
2. 匿名与权限不足需要按 API 协议响应，登录页面场景可能重定向，不能把所有拒绝都机械当成同一种状态。

## 案例

1. 教学场景：A 和 B 都已登录，订单属于 A；角色规则允许普通用户访问订单查询。

2. 先认证，再在资源边界核对订单归属；分别请求自己的订单、他人的订单和匿名请求。

3. 验证只有获授权请求获得数据，拒绝响应不泄露订单内容；日志能区分身份缺失和权限拒绝。

## 总结点

1. 认证确认身份。
2. 授权检查资源与动作。
