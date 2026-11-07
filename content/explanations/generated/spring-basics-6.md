<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-nature.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-extension.html)
- [Spring Framework 6.2 参考 · 3](https://docs.spring.io/spring-boot/3.5/reference/web/graceful-shutdown.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Spring 6.2 / Boot 3.5 教学设计：报表组件需要校验配置、建立可关闭的客户端，并在应用可接流量前完成小范围预热。区分对象初始化、容器启动和业务就绪。

1. 构造器适合建立对象必需的不变式，注入完成后的 @PostConstruct 或 initMethod 适合依赖注入值的轻量初始化；不要在此假设自身 AOP 代理已经生效。
2. 需要容器整体协作、启动停止顺序或后台任务时，考虑 SmartInitializingSingleton、SmartLifecycle 或 Boot 的启动回调，并为就绪状态、失败和超时建模。
3. 初始化要有失败清理和对应关闭动作。不可把耗时远程调用塞进每个 Bean 的初始化回调，再把上下文刷新成功当成业务已经可用。

## 参考分析

### 初始化阶段：注入完成不等于所有代理已就绪

常规过程包括实例化、属性填充、相关 Aware 回调、初始化前后处理以及初始化方法；具体扩展点会参与不同阶段。@PostConstruct 发生在初始化期间，对本对象的直接方法调用不能指望触发最终代理上的事务或异步增强。校验本地配置与建立明确可关闭的轻量资源可以放在这里，跨 Bean 长业务应另设边界。类比新房交付：水电接通（注入完成）不等于智能家居联网（代理与就绪回调完成），入住动作要等全链路就绪。

### 整体协作：生命周期与就绪条件需要分开

SmartInitializingSingleton 在常规非懒加载单例创建完成后回调，不能据此推断所有懒加载组件也已初始化。SmartLifecycle 更适合需要阶段和停止协议的组件。Boot 的 ApplicationRunner 等可组织启动工作，但对外是否接流量仍应由 readiness 等可观测条件决定，避免端口已监听却尚未完成必要准备。

### 关闭与失败：成对释放也要覆盖半初始化

完整初始化后的单例可通过 @PreDestroy、destroyMethod 或生命周期协议释放资源，prototype 的销毁责任另行安排。如果客户端创建成功而后续校验抛错，不能只假设普通销毁回调必然替这次失败收尾，应在失败路径主动关闭已经取得的资源。初始化和关闭都应有时间预算，避免部署无限等待。

## 案例

### 操作设计：配置错误应阻止就绪

为报表组件定义必填地址与连接超时，在类型化配置校验后建立客户端；预热任务单独记录开始、完成和失败状态。教学测试分别输入缺失地址、不可达地址和正常地址，观察启动错误与 readiness。预期错误能定位到配置或预热步骤，未满足必要条件时不接业务请求；不在每个 Bean 回调中互相调用做全量预热。

### 失败推演：创建资源后预热失败

给客户端工厂和关闭动作加计数，在资源已建立后制造预热异常，检查失败分支只释放该资源一次；正常上下文关闭时同样验证释放。再给关闭过程加可控阻塞，核对停机超时与未完成工作的处理。这里是教学验收步骤，不声称已对真实远程客户端完成故障演练。

## 总结点

1. 水电接通不等于智能联网
2. 轻量初始化与业务就绪分开
3. 初始化期间不假设自身代理有效
4. 资源取得和释放都覆盖失败
