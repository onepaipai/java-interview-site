<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ServiceLoader.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html)

</details>

## 参考回答

1. SPI 按约定发现服务实现，ServiceLoader 还可按需创建并缓存提供者。
2. 依赖注入容器管理其 Bean 的依赖装配、作用域和生命周期，职责不等同于服务发现。
3. 插件系统可先用 SPI 发现实现，再由受控工厂或容器装配依赖，另管类加载隔离与版本兼容。

## 参考分析

1. 类路径 SPI 通过 META-INF/services 中的接口全名文件声明提供者；模块系统使用 uses/provides 等声明。
2. 能被发现不代表自动获得 Spring 注入或事务代理；必须明确由谁创建、由谁管理。
3. 发现失败、重复实现、缺依赖和不兼容版本应在可诊断的边界拒绝，而不是热路径随机选择。

## 案例

1. 场景（教学示例）：导出系统支持 CSV、PDF 提供者，PDF 实现还需要字体仓库依赖。

2. 处理：用 ServiceLoader 枚举受信任实现及类型标识，再交受控工厂或容器装配；重复类型或缺依赖时启动失败。

3. 验证：新增合规提供者可被发现；直接由 ServiceLoader 创建的对象不会凭空获得容器依赖，装配后按选定类型正确导出。

## 总结点

1. SPI 找实现，容器管装配。
2. 发现不等于注入，管理方要明确。
