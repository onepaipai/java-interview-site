<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)
- [Spring Framework 6.2 参考 · 3](https://docs.spring.io/spring-security/reference/6.5/servlet/architecture.html)

</details>

## 参考回答

1. 围绕认证授权、提交回滚、JSON 契约、配置装配及错误协议选择真实边界，并在目标库验证关键兼容性。
2. 升级前固化预期和版本，升级后用相同触发方式验证；注解存在和启动成功不等于行为通过。

## 参考分析

1. 覆盖多种身份、失败事务、旧输入和时间字段，不能只有成功 200 路径。
2. 依赖、代理可见性和默认配置变化都可能产生运行差异，结合官方迁移说明检查。

## 案例

1. 教学场景：升级构建通过，API 却返回登录页，时间格式变化使旧客户端失败。

2. 运行新旧同一套接口、事务和真实端口测试，记录实际版本及未执行项。

3. 验证差异有兼容方案，候选和回退产物可追溯；未运行的 MySQL 门禁保持未验证。

## 总结点

1. 最小集合覆盖关键失败边界。
2. 升级比较实际行为与契约。
