<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/how-to/application.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html)
- [Spring Framework 6.2 参考 · 3](https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html)

</details>

## 参考回答

1. 让缺失配置、依赖歧义、端口冲突和迁移失败在启动期给出可定位原因，保留异常因果链与必要环境信息，不暴露秘密。
2. 结合 Boot FailureAnalyzer、条件报告和结构化日志缩小范围；不要把所有启动错误统一改成连接失败。

## 参考分析

1. 构造器依赖和类型化配置验证可提前暴露错误；条件未匹配与 Bean 创建后初始化失败是不同阶段。
2. 应用启动、端口监听、内容导入完成与 readiness 需要明确状态，避免进程活着却无法使用。

## 案例

1. 教学场景：启动只打印 Application failed，实际原因是必需地址缺失，排查者误重启数据库。

2. 保留根因与配置键，必要时增加定制 FailureAnalyzer；用缺配置、端口占用和非法迁移分别验证错误分类。

3. 预期日志说明失败阶段及可采取动作，监控能识别未就绪；输出不包含密码、完整令牌或敏感连接参数。

## 总结点

1. 保留根因和失败阶段。
2. 启动状态与业务就绪分开。
