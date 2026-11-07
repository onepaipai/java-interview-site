<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html)

</details>

## 参考回答

1. @ConfigurationProperties 把同一前缀的配置绑定为结构化类型，便于表达层级、单位、默认值和校验，减少散落字符串键与手工解析。
2. 它仍需正确注册并在必要时启用验证；绑定成功不代表外部地址可达，也不保证配置没有被更高优先级来源覆盖。

## 参考分析

1. Duration 等类型可明确超时单位，@Validated 配合约束可在启动期拒绝非法值；元数据还能帮助编辑器发现键。
2. 不要把敏感配置对象整体写入日志；不同环境应共享配置形状，秘密通过受控外部来源提供。

## 案例

1. 教学场景：多个 @Value 分别读取支付地址与超时，其中某处把秒当成毫秒。

2. 定义 payment 前缀的类型化配置和超时范围，增加缺失地址、非法时长和合法值的绑定测试。

3. 验证非法值导致可定位的启动错误，合法值使用明确单位；排查覆盖时只输出脱敏后的来源和必要字段。

## 总结点

1. 结构和单位进入类型契约。
2. 启动校验与秘密保护并行。
