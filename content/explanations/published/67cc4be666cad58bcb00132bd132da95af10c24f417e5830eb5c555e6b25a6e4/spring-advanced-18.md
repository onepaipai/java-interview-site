<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/method-security.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/architecture.html)

</details>

## 参考回答

1. URL 授权限制 HTTP 入口，方法授权在启用后保护经过其增强边界的业务调用；对象归属与租户条件仍要在掌握资源的边界检查。
2. 两者不是互相替代，也不能假定私有方法或自调用都会经过方法授权代理。

## 参考分析

1. 方法安全需要明确启用，PreAuthorize 等规则还要处理认证缺失和受控参数，不能依赖前端按钮。
2. 同一服务被任务、消息或内部调用复用时，要决定其身份来源；系统身份不应默认拥有全部用户资源权限。

## 案例

1. 教学场景：HTTP 管理路径已保护，但任务入口直接调用同一退款服务，缺少对象范围校验。

2. 统一退款用例授权和归属判断，分别从 HTTP、受管服务调用和后台任务进入。

3. 验证普通用户不能退款他人订单，未带可信身份的任务按协议失败或使用最小系统权限。

## 总结点

1. 入口与业务增强分别保护。
2. 资源授权覆盖真实调用边界。
