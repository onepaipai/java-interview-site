<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html)

</details>

## 参考回答

1. 自动配置使用独立包、明确条件与专属配置前缀，通过 imports 元数据发现，避免扫描宿主根包或任意替换用户 Bean。
2. 默认能力按缺失 Bean 等条件退让，显式开关和覆盖契约需要组合测试；顺序控制不等于强行决定实例创建次序。

## 参考分析

1. 可选依赖的类加载要隔离，缺库时不应因条件判断前解析返回类型而崩溃。
2. starter 避免无理由引入影响 Web、安全和数据库默认行为的大依赖，依赖管理与宿主版本兼容要记录。

## 案例

1. 教学场景：通知 starter 扫描公司根包，意外带入其他服务配置并产生 Bean 冲突。

2. 缩小包与显式 Import，测试缺库、禁用、用户实现以及不同宿主组合，检查打包 imports。

3. 验证默认能力仅在合适条件出现，用户实现保留，未启用功能不改变宿主原有接口与安全策略。

## 总结点

1. 条件和扫描范围保持克制。
2. 默认能力尊重用户覆盖。
