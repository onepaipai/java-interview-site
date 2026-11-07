<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/util/ContentCachingRequestWrapper.html)

</details>

## 参考回答

1. Servlet 请求流通常被消费后不能任意重读，日志或签名 Filter 提前读完可能让 MVC 无法绑定请求体。
2. 按目标选择有上限的缓存或可重放包装，并约束内容类型、字符集、大小和敏感字段；不能无界把整个上传读入内存。

## 参考分析

1. ContentCachingRequestWrapper 会在流被读取时缓存，并不主动读取，也不自动把输入流重置成可无限重读。
2. 日志通常适合在下游读取后查看受限缓存；验签若需先读再交给下游，要明确提供重放语义而不是误用缓存查询 API。

## 案例

1. 教学场景：签名过滤器先读 JSON，控制器随后报请求体缺失。

2. 分别测试原始流、受限缓存日志包装和真正支持重放的验签包装，覆盖空体、UTF-8 和超限请求。

3. 验证验签使用原始字节且控制器仍收到一致内容，超限受控拒绝，日志不记录密码或完整令牌。

## 总结点

1. 读取缓存不等于输入流可重放。
2. 大小与敏感内容必须受控。
