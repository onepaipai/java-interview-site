# 知序 · Java 面试题库

按知识模块整理题目和回答，支持桌面与手机。技术栈：Vue 3、TypeScript、Spring Boot、Java 17；开发使用 H2，自有服务器使用 MySQL。

## 功能

- 模块目录、模块内及全局搜索、分页、题目独立链接、上下题导航。
- 管理员维护题目、Markdown 回答、图片、知识模块与普通账号；普通账号阅读和 AI 问答。
- 编辑器支持预览、代码高亮、图片上传；未保存离开提示、版本冲突保护。
- AI 解释、参考回答、追问和 RAG 来源；采用 AI 回答后仍需手动保存。
- 管理员上传知识资料、检索来源、按批构建向量；模型密钥仅保留在服务器。
- 空模块可归档；移动题目后旧题目链接自动修正归属。

支持先答再看、自评、首页待复习和继续上次阅读。自评复用学习进度接口，保留已有收藏与笔记；收藏、笔记编辑、资料编辑和导入导出仍没有页面入口。

## 本地运行

需要 Java 17+、Maven 3.9+、Node 24。在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

访问 http://127.0.0.1:5173/#/catalog ，账号 `admin`。首次密码位于 `backend/data/admin-password.txt`，在线改密不会同步此文件。停止服务执行 `scripts/stop-local.ps1`。

数据库：`backend/data/interview.mv.db`；图片：`backend/data/uploads`。密码需要 12–64 个字符，且 UTF-8 编码不超过 72 字节。

## 文档

- [文档导航](README.md)：按用途分类的统一入口（项目入口、常青指南、内容规范、接口契约与轮次报告）。
- [部署、备份和恢复](guide/deployment.md)：Docker Compose、MySQL、HTTPS 与恢复步骤。

## 内容与升级

首次导入 165 道原始题和 21 个模块各 50 道高级题，共 1,215 道。原始 `content/Java.md` 不改写。高级题包按稳定来源去重，解析升级保留人工修改及主动删除，旧包不能覆盖已记录的更高版本。数据库迁移目前为 V1–V6，升级前备份。

<!-- content-status:start -->
当前解析包为 `explanations-v37`，共 1215 道：1215 道题目级正文、0 道固定样例、0 道主题正文。独立正文不等于事实核验完成；审核台账中 1215 道有完整事实审核证据，其余保持待审核。结构、案例执行、事实核验及人工合并分别记录在 [审核台账](../content/explanations/review-ledger.json)。
<!-- content-status:end -->

## 日志维护

运行日志不进入交付包。可预览再清理旧日志：

```powershell
.\scripts\clean-logs.ps1 -OlderThanHours 24 -WhatIf
.\scripts\clean-logs.ps1 -OlderThanHours 24
```

脚本保留常规本地服务日志、近期日志和被占用文件；跳过依赖、发布包、备份和符号链接。数据库、图片及配置不在清理范围内。
