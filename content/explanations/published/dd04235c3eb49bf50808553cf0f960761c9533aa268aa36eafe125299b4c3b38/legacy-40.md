<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银多环境沙盘:同一应用跑开发/测试/生产三套数据库——profile 隔离环境配置,命令行/环境变量覆盖文件(运维不改包即可调参)。

1. 优先级链(高→低):命令行参数>环境变量>应用外配置(./config)>classpath 内>application-{profile}.yml>application.yml>jar 内默认——核心规律:命令行>环境变量>文件;外置>内置;profile 专属>通用。
2. profile 切换:application.yml 的 spring.profiles.active=dev(默认)→命令行 --spring.profiles.active=prod 覆盖→环境变量 SPRING_PROFILES_ACTIVE;按环境加载 application-{env}.yml;@Profile 控 Bean 生效。
3. 工程实践:application.yml 只放共性+active 默认值;各环境差异进 application-{env}.yml(密码不入库——环境变量或配置中心注入,第 128 题密钥管理);生产用配置中心(Nacos/Apollo)动态下发+热刷新(@RefreshScope,第 23 题动态线程池同源)。

## 参考分析

### 第二步扩展① 机制:为什么命令行/环境变量最高

- 运维不可变部署包原则:同一 jar 跑多环境——环境差异必须外部化。
- 命令行/环境变量=部署时注入(不重新打包)。
- 配置中心=运行时可变(动态调参)——三层外部化强度:包内固化<环境注入<中心下发,强度越高变更越敏捷。

### 第二步扩展② 反例:配置的两种事故

- 事故一:生产密码写在 application.yml 提交进 git(密钥泄漏,第 128 题)——历史永久可查。
- 修复=环境变量/密管系统+仓库历史清理。
- 事故二:profile 文件相互引用失效——prod 覆盖 dev 但漏覆盖某 key(新 key 加在 dev 忘加 prod)→生产走了默认值。
- 修复=启动日志打印生效配置摘要+关键 key 清单核对。

### 第二步扩展③ 边界:优先级的实际用法

- 本地调试:命令行覆盖端口/日志级别(不改文件)。
- 容器部署:环境变量注入(K8s ConfigMap/Secret)。
- 灰度:同一镜像不同环境变量——优先级链不是用来背的,是用来解释“为什么我配了没生效”(被更高层覆盖)。

## 案例

### 第三步发散·验证与推演 验证:优先级的实测走查

- 验证:覆盖断言(yml 设 8080,命令行 --server.port=8081→8081 生效)。
- profile 断言(active=prod→application-prod.yml 的 key 覆盖通用文件。
- 未覆盖 key 保留通用值)。
- 环境变量断言(SPRING_ 前缀注入生效)。
- 生效摘要断言(启动打印关键配置清单,人工核对)——四组固化加载链,本机可复跑。

### 第三步发散·发散要点 追问链:配置三刀

- **追问①·随机值/占位符**：${KEY:默认值}(缺省兜底,启动期解析)
- **追问②**：@ConfigurationProperties vs @Value=类型安全绑定(推荐)vs 单值
- **追问③·动态配置**：配置中心+@RefreshScope(热刷新销毁重建 Bean,第 34 题作用域同源)

## 总结点

1. 命令行>环境变量>文件,外置>内置
2. profile 文件按环境覆盖
3. 密码走环境变量/密管,不入 git
