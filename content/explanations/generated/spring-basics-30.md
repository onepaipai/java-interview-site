<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html)

</details>

## 参考回答

1. 把类路径、属性、Bean 与应用类型等前提写成明确条件，并验证各环境实际解析到的配置；不要依赖隐含默认值或本地残留依赖。
2. 用条件评估报告解释装配结果，以最小上下文覆盖启用、禁用、缺依赖和用户覆盖等分支。

## 参考分析

1. 属性不存在、字符串 false 和拼写错误可能产生不同匹配结果；需要记录 matchIfMissing 等配置的真实含义。
2. 装配成功不等于外部依赖可用，关键配置还需类型校验和受控启动失败信息，日志应隐藏秘密。

## 案例

1. 教学场景：本地通知客户端正常，测试环境因未设置开关没有装配，直到请求才暴露缺功能。

2. 显式定义开关默认策略，测试属性缺失、false、true 和用户自定义实现；检查条件报告而非盲目扩大扫描包。

3. 验证每个分支 Bean 数量可解释；必需能力缺失在启动校验中报出配置键，日志不打印令牌。

## 总结点

1. 条件前提写成可测试契约。
2. 装配结果用报告解释。
