<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 SDK 沙盘:引入 starter-web 自动配置 Tomcat/MVC/Jackson——自动配置等于条件化 bean 定义加 starter 聚合,约定优于配置的工程化。

1. 自动配置三步 starter 引依赖聚合 jar→AutoConfiguration.imports 声明配置类→条件评估决定是否生效——条件不满足配置跳过按需装配。
2. 条件注解族 OnClass 类路径有某类,OnMissingBean 用户未自定义,OnProperty 属性条件——MissingBean 让用户覆盖默认宿主优先。
3. 诊断 --debug 启动打印条件评估报告每个自动配置的匹配不匹配加原因——条件不生效的排查入口。

## 参考分析

### 机制:条件评估与按需装配

自动配置三步:starter 聚合依赖→imports 声明配置类→条件评估决定生效。条件注解族:OnClass(类路径)、OnMissingBean(宿主未自定义——让用户覆盖)、OnProperty(属性条件)。按需装配:条件不满足→配置跳过→bean 不创建。诊断:--debug 输出条件评估报告。

### 反例:自动配置的两种事故

事故一,条件误判:OnClass 的类名拼错——条件永不匹配→自动配置静默失效。事故二,MissingBean 缺失:用户自定义了 bean 但 SDK 也注册了(缺 MissingBean)→bean 冲突。修复:条件评估报告(--debug)+MissingBean 纪律。

### 取舍:starter 的设计

starter=依赖聚合(pom)+自动配置(配置类)。自研 starter 的准入条件:能力被至少 3 个无关联项目需要加配置模式稳定加有条件化支持——三条件满足才值得做 starter。

## 案例

### 验证:自动配置的断言组

验证:条件断言(类路径无 DataSource→跳过);覆盖断言(用户自定义→MissingBean 跳过默认);报告断言(--debug 输出)——三组固化自动配置的条件语义。验证结论:条件不生效在报告中有原因,排查入口。

### 追问链:自动配置三刀

一刀:starter 的设计 starter 依赖聚合 pom 加自动配置 jar。二刀:自动配置的顺序 AutoConfigureBefore After 配置类的执行顺序。三刀:排除自动配置 SpringBootApplication exclude 排除的合理场景记录进 ADR。

## 总结点

1. 条件评估决定生效,MissingBean 宿主优先
2. starter 打包开箱即用
3. --debug 看条件评估报告
