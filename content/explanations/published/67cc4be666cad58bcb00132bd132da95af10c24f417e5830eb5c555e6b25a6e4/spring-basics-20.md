<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-methods/responseentity.html)

</details>

## 参考回答

1. ResponseEntity 把 HTTP 状态、响应头和响应体组合为明确返回值，适合创建资源、条件请求、下载等需要控制协议元数据的接口。
2. 它不替你定义业务错误、不负责鉴权，也不保证响应体可以被所选转换器成功序列化。

## 参考分析

1. 创建成功可返回 201 和 Location；无响应体的成功可选择 204，不能再依赖客户端读取它的 JSON 内容。
2. 缓存头、ETag 和内容类型都需要明确协议及测试；返回字节数组也不代表下载权限已经校验。

## 案例

1. 教学场景：创建订单后前端需要知道新资源地址，旧接口只返回字符串 success。

2. 定义包含订单 ID 的响应，返回 201 并给 Location 设置可访问的资源地址；查询与创建权限各自验证。

3. 验证状态、头和体符合约定，Location 指向正确资源；非法创建仍返回错误，不能因为用了 ResponseEntity 就视为成功。

## 总结点

1. 状态、头和体共同表达协议。
2. 响应容器不代替业务语义。
