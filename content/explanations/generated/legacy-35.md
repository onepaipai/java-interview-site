<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/aop.html)

</details>

## 参考回答

1. AOP 将跨多个业务点的共同逻辑提取为切面，通过切点选择连接点、由通知在相应时机执行；典型用途有事务、观测和部分权限控制。
2. Spring AOP 主要基于代理处理方法执行，调用需经过代理并匹配规则；目标内自调用通常不会重新进入增强链。

## 参考分析

1. 代理在初始化后由 AbstractAutoProxyCreator 创建：有接口默认 JDK 代理，无接口或 proxyTargetClass=true 走 CGLIB。
2. Spring AOP 是运行时代理，只拦方法执行；AspectJ 编译期或类加载期织入，支持字段与构造器，能力面更大但需独立织入器。
3. Around 通知需要正确调用 proceed 并保持返回值与异常语义，日志不能吞掉业务异常或泄露参数秘密。
4. 并非所有业务规则都应塞入切面，涉及资源归属等判断仍需在可理解的业务边界保持明确。

## 案例

1. 教学场景：多个查询入口都要统计耗时，希望减少重复计时代码。

2. 对受管服务的指定方法添加计时切面，在 finally 中记录耗时，保留正常返回与异常传播。

3. 验证成功和失败均有观测记录，异常类型不变；对照自调用路径，说明它不会自动增加一次内部增强记录。

## 总结点

1. 切点选位置，通知写共同逻辑。
2. 代理路径决定增强是否执行。
