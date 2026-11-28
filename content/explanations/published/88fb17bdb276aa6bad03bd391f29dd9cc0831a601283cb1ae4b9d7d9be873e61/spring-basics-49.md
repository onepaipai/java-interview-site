<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银启动沙盘:启动失败只看到 ApplicationContext 生成失败,不知道哪个 bean 什么原因——可诊断性三件套:条件评估报告(--debug)、FailureAnalyzer 结构化输出、启动追踪(ApplicationStartup)。

1. 诊断手段:--debug 的条件评估报告(每个自动配置的匹配/不匹配);FailureAnalyzer(内置的结构化失败分析:端口占用、bean 缺失、绑定错误的友好提示);自定义 FailureAnalyzer;启动日志的 bean 创建轨迹。
2. 常见启动失败:bean 缺失、条件不满足、循环依赖、端口占用、配置绑定失败(类型不匹配)——每种都有内置 FailureAnalyzer,自定义失败可注册自己的 Analyzer。
3. 启动的可观测:ApplicationStartup(Spring 6 的启动步骤追踪,bean 创建耗时、慢 bean 识别);启动失败进监控(失败率、原因分布)——可诊断性=排查时间从小时到分钟。

## 参考分析

### 第二步扩展① 机制:启动失败的结构化诊断

- 诊断手段:--debug 的条件评估报告(每个自动配置的匹配/不匹配)、FailureAnalyzer(内置的结构化失败分析:端口占用、bean 缺失、绑定错误的友好提示)、自定义 FailureAnalyzer、启动日志的 bean 创建轨迹。
- 常见启动失败(bean 缺失/循环依赖/端口占用/配置绑定)每种有内置 Analyzer。

### 第二步扩展② 反例:启动失败不可诊断的代价

- 沙盘:启动失败只看到堆栈,无结构化提示,排查耗时数小时。
- 修复:FailureAnalyzer 友好提示+--debug 条件评估报告+ApplicationStartup 启动追踪(慢 bean 识别)。
- 启动失败的可诊断性=排查时间从小时到分钟。

### 第二步扩展③ 取舍:诊断的投入与收益

- 投入:自定义 FailureAnalyzer(每类失败一个)+启动追踪配置。
- 收益:排查时间从小时到分钟。
- 度量:启动失败的排查耗时对比改进前后。
- 边界:通用失败用内置 Analyzer,业务失败自研,投入以"高频失败优先"排序,避免为低频路径堆工具。

## 案例

### 第三步发散·验证与推演 验证:启动诊断的断言组

- 验证:报告断言(--debug 的条件评估报告每个自动配置的匹配状态)。
- FailureAnalyzer 断言(端口占用的友好提示而非原始堆栈)。
- 启动追踪断言(ApplicationStartup 的步骤耗时慢 bean 识别)——三组固化启动诊断。

### 第三步发散·发散要点 追问链:启动诊断三刀

- **追问①**：FailureAnalyzer 的自定义——实现 FailureAnalyzer 接口,注册到 META-INF/spring.factories,业务校验失败、依赖缺失等自定义失败的分析器
- **追问②**：启动失败的告警——失败率、失败原因分布进监控,告警与值班响应
- **追问③**：诊断的文档化——常见启动失败的排查指南(端口/循环/条件/绑定各一节),进运维手册的启动章节

## 总结点

1. 条件评估报告+FailureAnalyzer 结构化
2. 启动追踪慢 bean 识别
3. 启动失败进监控与告警
