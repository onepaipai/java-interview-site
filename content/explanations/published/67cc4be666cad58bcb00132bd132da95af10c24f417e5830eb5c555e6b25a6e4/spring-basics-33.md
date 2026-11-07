<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html)

</details>

## 参考回答

1. 组件扫描按应用指定包发现 Component 等候选；Boot 自动配置按 imports 元数据发现候选并按条件装配基础设施。
2. 应用组件与可复用自动配置应有明确入口；不要让自动配置类同时被大范围扫描，造成意外导入或条件顺序问题。

## 参考分析

1. 扩大扫描范围可能带入第三方配置、测试组件或同名 Bean，掩盖真正的候选发现问题。
2. 自动配置通常显式 Import 所需组件，不靠自动配置内部再扫描全包；打包后的元数据也必须验证。

## 案例

1. 教学场景：自制 starter 在本地同仓源码能用，打成 JAR 后默认客户端消失。

2. 检查 imports 文件和候选类条件，再用独立应用仅依赖产物验证；应用业务组件保持原有扫描根。

3. 预期 JAR 方式也能条件装配且用户实现可覆盖；不通过把整个公司根包加入扫描来掩盖缺失元数据。

## 总结点

1. 扫描面向指定包的组件。
2. 自动配置有独立发现入口。
