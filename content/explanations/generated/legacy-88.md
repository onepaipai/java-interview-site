<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html)

</details>

## 参考回答

1. Boot 启用自动配置后从约定元数据发现候选，按类路径、配置、Bean 和应用类型等条件注册默认能力。
2. Boot 3 用 AutoConfiguration.imports 声明候选并按条件装配；历史 spring.factories 入口不能套到全部版本。

## 参考分析

1. starter 聚合依赖，自动配置负责条件化装配；缺失 Bean 条件允许用户覆盖默认实现。
2. 自动配置不要被普通组件扫描重复发现，顺序主要影响定义应用而非直接规定实例创建顺序。

## 案例

1. 教学场景：自制默认客户端只在本地源码工程被扫描，打包后不生效。

2. 检查 imports 是否进入 JAR，核对类路径和条件报告，以独立宿主测试默认、禁用、缺库和用户覆盖。

3. 验证每条分支可解释，宿主无需扫描依赖根包，也不会出现两个意外候选。

## 总结点

1. 元数据发现加条件装配。
2. 版本入口和覆盖契约明确。
