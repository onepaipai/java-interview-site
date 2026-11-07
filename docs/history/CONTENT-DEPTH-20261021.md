> 历史记录：描述当时的实现与验收，不代表当前功能或本轮测试结果。当前说明见 [文档导航](../README.md)。

# 题目与回答改进记录（2026-10-21）

前一轮主要完成工程治理；内容格式覆盖不能说明题解达到资深或架构面试水平。本轮改动直接落在题解正文与阅读页。

## 原问题与改动

旧格式将回答每点限制为 80 字、分析每点 110 字，复杂题被压成提示词；864 道仍使用主题正文，独立正文也可能缺少足够论证。因此保留旧格式兼容，同时增加深入题解，不通过批量扩写模板冒充逐题重写。

新题解包含具体场景、可口述结论、机制与取舍、故障推演、面试追问和关键判断。分析可使用段落、三级标题、比较表和必要代码，案例必须指出操作顺序与可观察结果。数字均标记为题设或简化计算，未执行的中间件实验写预期。

例如幂等题从“键绑定调用方、动作和参数摘要”展开为：唯一键作用域、参数规范化、并发占位与事务、跨服务子键、未知状态、保留期限，以及远端成功后响应丢失的恢复过程。锁题明确解释：资源尚未观察到新令牌前，单纯保存最高令牌不会自动感知换主；严格小于 SQL 是单次最终写协议，同令牌重试需要单独结果协议。

## 本次完成的正文

| 原题 | 可审阅正文 |
| --- | --- |
| 事务代理自调用 | [Spring](../../content/explanations/generated/spring-advanced-1.md) |
| RR 下不同读写结果 | [MySQL](../../content/explanations/generated/database-advanced-24.md) |
| 线程池等待估算 | [并发](../../content/explanations/generated/concurrency-advanced-17.md) |
| 数据库与缓存失效 | [缓存](../../content/explanations/generated/cache-messaging-1.md) |
| Kafka 幂等的边界 | [消息](../../content/explanations/generated/cache-messaging-30.md) |
| 跨服务幂等键 | [幂等](../../content/explanations/generated/distributed-8.md) |
| Outbox 与 CDC | [事件发布](../../content/explanations/generated/distributed-14.md) |
| 栅栏令牌 | [旧写保护](../../content/explanations/generated/distributed-16.md) |
| 单体与微服务选型 | [架构](../../content/explanations/generated/architecture-1.md) |
| 手机银行转账设计 | [转账](../../content/explanations/generated/system-design-1.md) |
| 抢购与有限排队 | [抢购](../../content/explanations/generated/system-design-4.md) |
| 多租户 AI 检索 | [权限](../../content/explanations/generated/ai-production-6.md) |

正文源为 `content/explanations/deep-answers.mjs`，统一加载入口为 `scripts/question-contents.mjs`。新发布包 V7 保留稳定题目身份，只对旧发布基线一致的答案自动升级，手工内容仍保留。

## 阅读体验

题目卡片直接展示场景与约束；“完整解析”展示全部推理，“口述复习”只展示结论与关键判断。目录跟随可见内容，支持子标题跳转；桌面长目录在可视区域内滚动，手机保留底部目录与翻题。比较表和代码在自身容器内横向滚动，不撑宽页面。阅读、编辑和来源预览共用渲染器。

## 验证与范围

结构校验与逐题映射覆盖全部 1215 道；真实隔离测试库核对全部发布答案摘要，并测试 12 道深入题解和 21 个模块代表页在 1440/390/320 宽度的排版。`DeepAnswerExamplesTest` 执行 Spring 自调用/跨 Bean 提交对照，以及题解内实际 SQL 的新、旧、同令牌更新对照。后者采用 H2，仅验证条件更新，不证明分布式授权系统安全。

`test-deep-answers.mjs` 检查新格式拒绝缺段、错误标题、总结后追加与教学算术；简化幂等和栅栏模型不替代真实 Kafka、Redis 或 MySQL 故障实验。MySQL 环境仍缺失，相关集成测试保持跳过，不能据此正式发布。

本轮深入重写仅 12 道，另外 1203 道没有按本轮标准重写。总计 350 道题目独立正文、1 道固定样例、864 道主题正文；独立正文不等于事实审核完成，审核台账不因本次格式升级批量改为通过。后续需要按题逐个替换主题案例，并对论证、版本和可执行案例核验。
