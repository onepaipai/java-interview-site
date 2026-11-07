<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-nature.html)

</details>

## 参考回答

1. 区分无状态纯函数与持有配置、客户端或请求状态的对象；后者明确生命周期、所有权和并发策略，可用受管依赖表达。
2. 不把用户、租户或临时缓冲放在全局字段；静态改成单例 Bean 不自动线程安全。

## 参考分析

1. 隐藏网络和配置依赖难以测试，构造器能暴露契约并替换外部能力。
2. 共享客户端核对线程安全与关闭要求，配置更新使用完整快照；纯计算不必为统一形式强行注入。

## 案例

1. 教学场景：静态日期格式器和 currentTenant 被多个请求修改，查询与日志串数据。

2. 改用不可变格式器或局部状态，身份显式传参，外部客户端集中管理资源。

3. 验证并发交错无串租户，异常后资源和上下文清理，替身可控制外部失败。

## 总结点

1. 先识别状态和资源所有权。
2. 受管单例不自动线程安全。
