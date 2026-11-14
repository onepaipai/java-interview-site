<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:团队有通用的"审计日志"能力(每个项目都要接)——自定义 starter=打包"依赖+自动配置+属性类"为独立 jar,引入即用(约定优于配置,第 88 题)。

1. starter 三件套:一,autoconfigure 模块(@Configuration+条件注解+@ConfigurationProperties 属性类);二,starter 模块(纯 pom 聚合依赖);三,注册文件(META-INF/spring/…AutoConfiguration.imports——Boot 3 路径)。
2. 命名约定:官方=spring-boot-starter-XXX;自定义=XXX-spring-boot-starter(audit-spring-boot-starter)——区分官方与第三方;属性前缀=@ConfigurationProperties(prefix=audit)——配置项 audit.enabled 等。
3. 条件注解:@ConditionalOnClass(类在 classpath 才装配)+@ConditionalOnMissingBean(用户未自定义才装配——用户优先)+@ConditionalOnProperty(配置开关 audit.enabled=true)——三条件组合=精细控制(第 88 题条件族)。

## 参考分析

### 机制:starter 的"封装即复用"

starter=把"依赖+配置+自动装配"打包为可复用单元:使用者引入 starter+配置属性即可(无需理解内部实现);starter 的价值=消除"每个项目重复配置"的劳动(约定优于配置的实践)。类比工具箱:starter=工具箱(打开即用),内部工具(autoconfigure)自动组装。

### 反例:starter 的两种事故

事故一:starter 缺条件注解——无条件注册 bean(与其他 starter 冲突或覆盖用户配置);修复=@ConditionalOnMissingBean(用户优先)+@ConditionalOnClass(依赖存在才装配)。事故二:starter 的属性无默认值——使用者必须配置所有属性才能启动;修复=@ConfigurationProperties 的默认值(合理默认,减少配置负担)。

### 取舍:starter 的内部复杂度

简单的 starter(一个配置类+一个 bean):够用就好;复杂的 starter(多个配置类+条件组合+生命周期管理):按需求递增——starter 的复杂度=使用者"少配置"与开发者"多实现"的交换;starter 的文档(README:配置项/条件/示例)是使用者的第一入口。

## 案例

### 验证:starter 的走查核对

验证:引入 starter 断言(bean 自动注册——actuator/beans 可查);条件断言(缺依赖→不装配+条件评估报告说明);属性绑定断言(配置项正确绑定到 @ConfigurationProperties);用户优先断言(用户自定义 bean→starter 不覆盖)。验证:starter 的断言可程序化(Spring Boot 测试:ApplicationContextRunner 模拟不同条件)。

### 追问链:starter 三刀

一刀:"autoconfigure 与 starter 分开?"——autoconfigure(代码)与 starter(依赖聚合)分两个模块——使用者引 starter(包含 autoconfigure+依赖);开发者只依赖 autoconfigure(测试)。二刀:"starter 的版本管理?"——starter 与 autoconfigure 版本独立(自动配置变更→autoconfigure 版本升;依赖变更→starter 版本升)——版本解耦。三刀:"starter 的测试?"——ApplicationContextRunner(模拟不同条件:有/无依赖/有/无用户 bean/不同属性值)——starter 的自动化测试(Spring Boot 官方测试工具)。

## 总结点

1. 三件套:autoconfigure+starter+imports
2. @ConditionalOnMissingBean=用户优先
3. 属性默认值,减少配置负担
