<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银环境沙盘:Profile prod 的 Bean 在测试环境不存在调用方 NPE;ConditionalOnProperty 的属性拼错条件永不匹配 bean 悄悄缺失。条件装配的事故防御启动验证加环境一致性检查。

1. 条件装配的事故形态条件不匹配 bean 缺失调用方 NPE 运行时才发现启动期静默缺失;环境差异 dev 有 bean prod 没有测试通过生产失败。
2. 防御启动验证依赖的 bean 存在性检查条件文档化每个 Conditional 的条件与预期环境配置外部化 ConditionalOnProperty 的属性进配置中心启动失败诊断条件评估报告 debug。
3. ConditionalOnProperty 的 matchIfMissing 属性缺失时默认匹配 true 或不匹配 false 语义差异 missing 等于启用还是禁用按安全性选安全相关默认禁用。

## 参考分析

### 机制:条件评估与静默缺失

条件评估 Conditional 注解的条件在容器 refresh 时评估不满足则 bean 不注册静默无错误无警告。事故调用方依赖该 bean 启动期 NoSuchBeanDefinitionException 如果能追踪到或运行期 NPE 如果延迟使用。防御 ApplicationContextRunner 测试条件矩阵加启动验证依赖的 bean 存在性检查加条件文档化。

### 反例:条件静默缺失的两种事故

事故一属性拼错 ConditionalOnProperty name feature.enabled 但配置写了 feature.enable 少个 d 条件永不匹配 bean 缺失调用方 NPE。事故二环境差异 dev 有 Profile dev 的 mock bean prod 没有prod 环境缺失调用方 NPE。两条的正解启动验证依赖存在性加条件文档化加环境矩阵测试。

### 取舍:matchIfMissing 的语义

matchIfMissing true 属性缺失时条件匹配 bean 创建适合默认启用的功能。matchIfMissing false 属性缺失时条件不匹配 bean 不创建适合默认禁用的功能安全相关。判定安全相关的功能默认禁用 matchIfMissing false 功能开关默认启用 matchIfMissing true。

## 案例

### 验证:条件装配的断言组

验证:启动验证断言条件 bean 缺失时启动失败 fail-fast;环境矩阵断言 dev test prod 各环境的 bean 存在性矩阵 ApplicationContextRunner;配置断言 ConditionalOnProperty 的属性在环境配置中存在——三组固化条件装配的防御。

### 追问链:条件装配三刀

一刀 ConditionalOnProperty 的 matchIfMissing 属性缺失时默认匹配 true 或不匹配。二刀 自定义条件 Condition 接口复杂条件多属性组合的自定义。三刀 条件的可测试 ApplicationContextRunner 测试条件矩阵。

## 总结点

1. 条件缺失 bean 静默缺失 运行时 NPE
2. 启动验证 fail-fast
3. ApplicationContextRunner 测试条件矩阵
