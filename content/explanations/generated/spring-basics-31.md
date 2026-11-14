<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银配置沙盘:@Value 字符串注入拼错运行时才发现;@ConfigurationProperties 类型化绑定启动失败即暴露。

1. 类型化绑定 @ConfigurationProperties 加 Java 类(端口 int 布尔 enabled)——启动时绑定加类型转换,类型错误启动失败。
2. 类型化绑定收益 IDE 提示字段补全加元数据加校验 JSR 303 NotBlank Min 加不可变构造器绑定。
3. 散列 @Value 的问题字符串 key 分散拼错即静默 null 无类型无校验——@Value 适合单值简单注入多配置项用结构化。

## 参考分析

### 机制:类型化绑定的防护层

防护一类型转换字符串到目标类型类型不匹配启动失败;防护二审校 JSR 303 注解 NotBlank Min;防护三元数据 IDE 补全。三层防护类型错误启动暴露校验错误启动暴露 IDE 补全减少 typo。

### 反例:@Value 的两种事故

事故一 typo 的 key 拼写错误运行时 null 静默。事故二类型错误注入 String 转 int 时 NumberFormatException 运行时。两条的正解类型化绑定加校验错误在启动期暴露。

### 取舍:不可变配置

ConstructorBinding record 构造器绑定不可变配置构造后不变;可变配置 Setter 有并发风险运行中修改。不可变配置的线程安全免费。落地:@ConfigurationProperties 配合 record 与 @Validated,非法配置启动期即失败。

## 案例

### 验证:类型化绑定的断言组

验证:类型断言(端口属性非数字启动失败);元数据断言(IDE 配置补全);校验断言(NotBlank 的配置缺失启动失败)——三组固化类型化绑定。验证结论:断言失败即配置管理缺陷。对照:绑定失败在启动期报出具体属性路径,比 @Value 的运行时解析失败早一个阶段暴露。

### 追问链:配置三刀

一刀:不可变配置 ConstructorBinding record 构造器绑定不可变配置类的线程安全。二刀:配置的层级默认值配置文件环境变量命令行优先级覆盖。三刀:配置的热更 RefreshScope 热刷新销毁重建。

## 总结点

1. 类型化绑定启动 fail-fast
2. @Value 适合单值结构化用 Properties
3. 不可变配置用构造器绑定
