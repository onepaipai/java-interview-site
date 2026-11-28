<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银服务搭建沙盘:传统 Spring 要几十个 XML 与依赖版本对齐——Boot 约定优于配置+starter 一键依赖+内嵌容器+Actuator 运维端点。

1. 四个核心价值:自动配置(@Conditional 条件装配——classpath 有什么就装配什么);起步依赖(starter 聚合依赖+版本对齐);内嵌容器(jar 自启,不用外部 Tomcat);生产就绪(Actuator 健康检查/指标端点)。
2. starter 机制:聚合依赖(传递引入功能所需全部 jar)+自动配置类(@ConditionalOnClass/@ConditionalOnMissingBean——有类才配,用户没配才兜底);自定义 starter=编写 AutoConfiguration+import 注册文件+starter pom,内部组件统一接入。
3. 优点对应工程效率:版本仲裁(parent 管依赖冲突)/无 XML(JavaConfig+注解)/配置外部化(application.yml+profile,第 40 题)/一键构建运行(mvn package→java -jar)——本质=把 Spring 生态最佳实践固化为约定。

## 参考分析

### 第二步扩展① 机制:自动配置的条件链

- @EnableAutoConfiguration→加载各 starter 的 AutoConfiguration.imports→逐个按条件评估(@ConditionalOnClass=类在才配/@ConditionalOnProperty=开关/@ConditionalOnMissingBean=用户自定义优先)——用户 Bean 覆盖自动配置(覆盖路径:自定义 Bean→配置类→自动配置兜底)。
- debug=true 打出条件评估报告(Positive/Negative matches)看谁生效。

### 第二步扩展② 反例:Boot 的两种事故

- 事故一:自动配置与自定义打架——自定义 Bean 忘了排除自动配置,双实现注入歧义。
- 修复=@ConditionalOnMissingBean 意识+exclude 排除。
- 事故二:starter 版本乱引——绕过 parent 仲裁自带旧版依赖(冲突)。
- 修复=统一 parent/dependencyManagement,禁止 starter 内嵌版本号。

### 第二步扩展③ 取舍:约定优于配置的边界

- 约定=80% 场景零配置。
- 非约定场景(特殊容器/特殊路由)要懂底层 Spring 才能覆盖——Boot 降低入门但没降低精通线。
- 排错时仍要回到 Spring 机制(第 38 题流程)——自动配置报告+启动日志是回归底层的入口。

## 案例

### 第三步发散·验证与推演 验证:starter 机制的实测走查

- 验证:条件装配断言(引 starter→Bean 出现。
- 排除依赖→AutoConfiguration 跳过——debug 报告对照)。
- 覆盖断言(自定义同类型 Bean→自动配置让位——@ConditionalOnMissingBean 行为)。
- 内嵌容器断言(java -jar 直接起,无外部部署)。
- Actuator 断言(/actuator/health 返回 UP)——四组固化 Boot 行为,本机可复跑。

### 第三步发散·发散要点 追问链:Boot 三刀

- **追问①·配置加载优先级链**：命令行>环境变量>profile 文件>默认(第 40 题)
- **追问②·@SpringBootApplication**：三合一(@ComponentScan/@EnableAutoConfiguration/@SpringBootConfiguration)
- **追问③·自定义 starter 步骤**：autoconfigure 模块(条件类+Properties)+import 文件+starter 模块(纯 pom)——内部 SDK 标准交付形态

## 总结点

1. 自动配置=条件装配,用户优先
2. starter=依赖聚合+自动配置
3. 内嵌容器+Actuator=生产就绪
