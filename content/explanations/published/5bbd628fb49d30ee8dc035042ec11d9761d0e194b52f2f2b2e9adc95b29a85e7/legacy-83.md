<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. Bean 经过实例化、依赖填充、Aware、初始化前后处理及使用与销毁。
2. BeanPostProcessor 作用于实例，BeanFactoryPostProcessor 调整定义。
3. 代理可能在后处理阶段形成，避免初始化期依赖未就绪增强行为。

## 参考分析

1. 构造器循环无法靠提前暴露实例解决。
2. 早期引用可能造成代理与原对象差异，不能依赖三级缓存兜底设计。

## 案例

1. 场景（教学示例）：订单与库存服务互相通过构造器引用。
2. 处理：提取应用编排层，依赖方向单向；初始化工作不发起跨 Bean 的复杂业务调用。

3. 验证：启动无循环，事务与代理行为可测；关闭回调负责释放组件资源。

## 总结点

1. 先理依赖方向。
2. 初始化别跑长业务。
