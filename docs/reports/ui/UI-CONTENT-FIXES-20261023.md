# UI 与内容整改 · 2026-10-23

> 文档状态：历史快照（本地链接可能失效） · 重建版（原始明细不可恢复）。原文件在 2026-10-24 文档整理事故中丢失，无版本历史可恢复。本版基于测试指南、解析规范与留存证据重建；原报告的逐项整改说明不可恢复。

本轮修复 [UI 与内容审查（基线）](UI-CONTENT-REVIEW-20261023.md) 的发现：学习流程（先答再看、自评）、导航与阅读模式调整，以及 14 道题解修订，发布 explanations-v8 后续轮。正文源为 [answers/review-answers-20261023.mjs](../../../content/explanations/answers/review-answers-20261023.mjs)，通过统一内容加载入口与既有不可变发布流程生成。

## 留存证据

- `node scripts/test-ui-content-fixes.mjs`：使用 Java 17 执行泛型擦除题内的完整示例并保存执行记录（execution.json（`../../../backend/target/ui-content-examples/execution.json`））；检查本轮共享组不回退到串题模板。
- `test:learning-reader`：管理员与普通账号的揭示答案、自评保存、笔记/收藏保留、阅读偏好、面包屑、续读与待复习入口检查，覆盖 1280/390/320 宽度，截图见 `frontend/test-results/learning-reader/`（含 admin-1280-reader-viewport（`../../../frontend/test-results/learning-reader/admin-1280-reader-viewport.png`）、learner-390-home（`../../../frontend/test-results/learning-reader/learner-390-home.png`）、learner-390-reader-viewport（`../../../frontend/test-results/learning-reader/learner-390-reader-viewport.png`））。

## 待补

原报告 14 道题解的逐题修订说明与本轮验证的完整结果待补。
