<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/integration/cache/annotations.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/method-security.html)

</details>

## 参考回答

1. 同一业务 ID 在不同租户、权限视图或内容版本下可能对应不同结果，缓存键必须包含实际影响结果的维度，防止串数据或使用旧结构。
2. 版本可以隔离发布与数据代际，但应明确旧键过期和资源回收；并非把所有字段无差别塞入键就更安全。

## 参考分析

1. 租户标识应来自可信身份上下文，客户端传入的任意 tenant 不能直接取得其他租户缓存。
2. 键隔离不代替数据库查询授权；若结果随用户权限变化，需要权限版本或避免共享敏感响应缓存。

## 案例

1. 教学场景：两个租户都有商品 ID 7，旧键 product:7 导致价格和可见字段混用。

2. 使用受信任租户、业务 ID 和必要版本组成稳定键；分别填充两个租户并升级结构版本。

3. 验证互不读取对方数据，新版本不命中旧结构，旧键按预算过期；越权请求在读缓存前被拒绝。

## 总结点

1. 键包含影响结果的可信维度。
2. 版本隔离配合旧键回收。
