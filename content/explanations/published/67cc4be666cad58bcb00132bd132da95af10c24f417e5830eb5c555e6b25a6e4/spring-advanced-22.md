<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/filters.html#filters-forwarded-headers)

</details>

## 参考回答

1. 只信任明确受控的代理链，由入口清理客户端自带的 Forwarded 和 X-Forwarded-* 等头再设置可信值；后端应限制绕过入口的访问。
2. 协议、主机、客户端地址和重定向需要使用一致的可信解析规则；单纯打开转发头支持不会自动建立可信边界。

## 参考分析

1. 伪造协议可能影响安全 Cookie 或重定向，伪造地址可能绕过错误的 IP 白名单与限流策略。
2. 代理跳数、多个值和非标准头差异需按部署验证；日志既保留必要原始证据又避免把不可信值当认证结果。

## 案例

1. 教学场景：客户端直连后端并伪造 X-Forwarded-For 为内网地址，触发宽松限流。

2. 限制后端入口，代理覆盖可信转发信息；测试直接访问、受控代理和多层链路。

3. 验证伪造值不能扩大权限或改变安全重定向，正常外部 HTTPS 请求仍生成正确协议和地址。

## 总结点

1. 转发头可信度来自部署边界。
2. 清理客户端值并验证代理链。
