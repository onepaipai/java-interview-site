# scripts/

Three kinds of files live here. When adding one, put it in the right group.

## 校验/发布管线（verify.ps1 与 CI 按清单调用，勿随意删除）

- `verify.ps1` — 完整验证入口（格式、契约、内容、MySQL、浏览器 e2e）。
- `verify.ps1:18` 清单内的校验脚本：`check-deployment-config.mjs`、`verify-contract.mjs`、
  `sync-content-status.mjs`、`validate-content.mjs`、`validate-explanations.mjs`、
  `test-explanation-corrections.mjs`、`test-ui-content-fixes.mjs`、`test-spring-core-answers.mjs`、
  `test-spring-advanced-answers.mjs`、`test-database-basics-answers.mjs`、
  `test-explanation-publication.mjs`、`test-deep-answers.mjs`。
- `api-contract.mjs` — 被 `verify-contract.mjs` 引用。
- `build-manifest.mjs` — 发布哈希门禁记录（`verify.ps1:23`）。
- `package-release.ps1` / `verify-staged-release.mjs` — 发布打包与 staged 目录哈希比对。
- `start-local.ps1` / `stop-local.ps1` — 本地开发启动/停止（`-Rebuild` 强制全量构建）。
- `test-e2e.ps1` / `test-mysql.ps1` — 一次性环境跑浏览器 e2e / 隔离 MySQL 测试。
- `snapshot-question-bank.ps1` / `clean-logs.ps1` / `test-restore.py` — 运维辅助。

## 共享库（被管线脚本 import，同样勿动）

- `question-contents.mjs`、`explanation-content.mjs`、`explanation-deep.mjs`、
  `explanation-markdown.mjs`、`explanation-references.mjs` — 题面/题解加载、校验与渲染，
  被 `validate-explanations.mjs`、`sync-content-status.mjs`、`test-*-answers.mjs` 等 import。
- `publish-explanations.mjs` — 被 `test-explanation-publication.mjs` import。

## 历史一次性内容生成/审查工具（archive/）

不参与 verify 管线的旧工具已移入 `archive/`：`review-*-facts.mjs`（各模块事实核查）、
`build-explanations.mjs`、`prepare-*.mjs`、`verify-explanation-samples.ps1`、
`verify-explanation-upgrade.mjs`、`verify-reviewed-examples.ps1`、`verify-review-fixes.mjs`。
其中的 `.mjs` 已把仓库根定位与共享库 import 调整为 `../../`、`../`，可独立运行；
仅作追溯，不再维护。

如需确认哪些脚本仍在门禁中，以 `verify.ps1` 与 `.github/workflows/verify.yml` 的调用清单为准。
