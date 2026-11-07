<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-nature.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-extension.html)

</details>

## 参考回答

1. 典型受管 Bean 经实例化、依赖填充、相关 Aware 回调、初始化前处理、初始化方法及初始化后处理，最终供调用者使用。
2. BeanPostProcessor 可处理或替换实例，代理依赖相关扩展机制；适用 Bean 在容器关闭时执行销毁，具体扩展接口与作用域会改变细节。

## 参考分析

1. 定义后处理与实例后处理不同；不能在定义阶段提前 getBean 拉起业务对象。
2. 初始化期间不假设自身最终代理有效，懒加载改变创建时机，prototype 也不由容器完整跟踪销毁。

## 案例

1. 教学场景：客户端注入配置后打开资源，初始化后被包装，关闭时释放。

2. 记录构造、注入、初始化和包装探针，refresh 后获取最终对象，再关闭上下文，另测初始化失败。

3. 验证调用者获得受管包装，资源正常和失败路径都正确释放，不把常规轨迹当所有扩展的固定顺序。

## 总结点

1. 定义与实例处理分阶段。
2. 资源释放覆盖失败和作用域。
