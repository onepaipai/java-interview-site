<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银升级沙盘:Spring Boot 2 到 3 升级——代理方式变化 CGLIB 可能变化,序列化格式变化 Security 的 Session 序列化,安全行为变化 SecurityManager 移除过滤器链变更——框架升级的隐性行为变化需要真值测试拦截。

1. 框架升级的隐性行为变化代理 Spring 6 的 AOP 变化代理方式拦截器行为,序列化 Spring Session 的序列化格式 Jackson 版本的序列化差异,安全 Security 过滤器链的默认变化 CSRF 默认策略——三类变化不影响编译但影响运行时行为。
2. 验证手段真值测试发布稿的可执行代码后端已内置,行为断言事务安全序列化的矩阵测试,灰度对照双版本并行。
3. 与本仓库的衔接 SpringCoreExamplesTest Q4 7 9 真值测试加 SpringAdvancedExamplesTest Q3 4 19 真值测试——这些测试在升级后直接暴露语义漂移。

## 参考分析

### 机制:框架升级的三类隐性行为变化

代理 Spring 6 的 AOP 变化代理方式拦截器行为。序列化 Spring Session 的序列化格式 Jackson 版本的序列化差异。安全 Security 过滤器链的默认变化 CSRF 默认策略。三类变化不影响编译但影响运行时行为——真值测试发布稿的可执行代码直接拦截。

### 反例:升级遗漏的三种事故

事故一 内部 API 依赖 sun.misc BASE64Encoder 升级后 NoClassDefFoundError jdeps 前移发现。事故二 GC 行为漂移 默认堆参数 GC 触发阈值变化 内存行为漂移。事故三 依赖不兼容 框架不支持新 JDK 字节码增强 ASM 版本失败 启动即崩。三条的正解 五面清单加三级验证加灰度对照。

### 取舍:升级的策略与节奏

策略 LTS 跳跃 加每 LTS 内小版本跟安全补丁——LTS 策略减少升级频率。节奏 升级先于必须被动升级紧急加风险 主动升级从容。回滚 旧版本制品保留加回滚条件加升级演练。升级是变更走变更纪律。

## 案例

### 验证:升级验证的断言组

验证:代理断言(真值测试在新版本全绿代理生命周期边界语义不变);序列化断言(Session Jackson 的序列化兼容);安全断言(过滤器链 CSRF 认证行为的回归)——三组升级验证;ADR 记录升级的语义变化。

### 追问链:升级三刀

一刀 Spring Boot 3 的主要变化 javax 到 jakarta 包名变更 Native 支持 AOT Observability Micrometer 观测 Boot 3 的三大变化域。二刀 升级的顺序依赖先行框架先支持新版本再代码迁移 javax 到 jakarta 再 JDK 升级 顺序反了依赖崩。三刀 升级的回归集 真值测试加行为矩阵加灰度对照 升级的可信度等于回归集的完备度。

## 总结点

1. 代理序列化安全三类隐性行为变化
2. 真值测试是升级探针
3. 灰度对照验证升级
