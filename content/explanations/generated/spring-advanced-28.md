<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-extension.html)

</details>

## 参考回答

1. 后处理器等基础设施提前依赖或主动获取业务 Bean，可能使业务对象在完整 BeanPostProcessor 链就绪前被创建，错过自动代理。
2. 检查启动警告、创建时序和依赖方向；避免在定义后处理阶段用 getBean 拉起普通业务对象。

## 参考分析

1. 声明处理器的 Bean 工厂方法可采用合适的 static 方法和清晰返回类型，减少配置类及其依赖被提前实例化。
2. 启动没有失败也不证明增强完整，最终引用可能已经是提前创建的普通对象。

## 案例

1. 教学场景：自定义后处理器构造时调用订单服务，事务注解未按预期生效。

2. 移除基础设施到业务的早期依赖，延迟合适工作；记录最终代理类型及实际回滚路径。

3. 验证警告原因消除，订单失败后数据库回滚，其他 Bean 仍按正确生命周期处理。

## 总结点

1. 基础设施避免提前拉起业务。
2. 增强效果需用真实行为证明。
