# 自有服务器部署

推荐 Linux 单机、2 核 4 GB 内存起步；实际容量取决于其他服务和访问量。
以下以已安装 Docker Engine + Compose 插件、Nginx、Certbot 的 Linux 主机为例。
尚未获得服务器系统、域名和连接方式，所以这些文件是部署准备，不能视为已上线。

## 1. 上传项目

将 java-interview-site 上传到 /opt/java-interview-site。排除 node_modules、target、dist、data、日志、.env 和测试截图。
保留 frontend/package-lock.json 和 content/Java.md。不要覆盖服务器原有项目。

## 2. 初始化配置

```bash
cd /opt/java-interview-site
cp .env.example .env
chmod 600 .env
nano .env
```

替换 ADMIN_PASSWORD、DB_PASSWORD、DB_ROOT_PASSWORD 为不同随机密码。
管理员密码 12–64 字符且 UTF-8 编码不超过 72 字节，数据库密码建议使用随机字母数字，避免 Compose 的 $ 插值问题。
ADMIN_USERNAME 默认 admin。COOKIE_SECURE=true 用于 HTTPS。
密码只在首次初始化账号时生效；以后修改 .env 不会重置数据库内管理员密码。
MySQL 已初始化后修改 .env 中数据库密码也不会自动更新 MySQL 用户，须按 MySQL 用户管理流程修改。

## 3. 构建并启动

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
bash deploy/check.sh
```

首次拉取镜像/依赖需要网络。后端镜像现在以项目根目录为构建上下文，包含题包和接口契约并执行 Maven 测试。正式交付前运行 `scripts/verify.ps1` 和 `scripts/package-release.ps1`；发布入口要求 MySQL 和浏览器检查通过，验证记录缺项或源码/产物摘要变化时拒绝打包。

宿主机访问 http://127.0.0.1:8088/api/health 应返回 UP。
数据库使用 MySQL 8.4，字符集 utf8mb4，Flyway 初始化数据表。
启动等待数据库健康检查，后端自动导入题库；Web 等待后端健康检查通过。后端按单实例部署，生产上传卷启用进程文件锁，拒绝共享该卷的重复后端。它不是跨主机分布式租约；不能通过增加独立上传卷绕过单实例边界。
查看日志：docker compose logs --tail=100 backend。

## 4. 域名与 HTTPS

把域名 A/AAAA 记录指向服务器。开放公网 80/443。
修改 deploy/nginx-host.conf 的 interview.example.com 为实际域名；如果修改 HTTP_PORT，也修改反向代理端口。

使用服务器独立的新 Nginx 站点配置（不要覆盖其他站点）：

```bash
sudo cp deploy/nginx-host.conf /etc/nginx/conf.d/java-interview.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your.actual.domain
sudo certbot renew --dry-run
```

证书签发成功后用 https://your.actual.domain 访问。
容器 Nginx保留 HTTPS 转发头；登录 Cookie 为 HttpOnly、SameSite=Lax、Secure。
账号、导入和内容修改都经过后端权限校验与 CSRF 校验。
登录接口有按 IP 限速。宿主机反向代理必须保留模板中的 X-Real-IP / X-Forwarded-Proto。

如果暂时没有域名，可以经 SSH 转发做私有预览：

```bash
ssh -L 8088:127.0.0.1:8088 your-server
```

这种 HTTP 预览须临时设置 COOKIE_SECURE=false 并重建后端：
docker compose up -d --force-recreate backend
上线 HTTPS 前改回 true。不建议将当前环回端口改为公开监听。

## 5. 备份与恢复

```bash
bash deploy/backup.sh
```

备份包含整个数据库（账号、题库、回收站、学习记录、资料）与图片及校验和。
脚本短暂停止后端写入，确保数据库和图片一致，再自动启动后端。
完整复制该时间戳目录到服务器之外。备份包含账号密码哈希和个人笔记，应限制访问。
.env 单独保存到安全位置；备份不包含明文部署密码或应用镜像。

每日凌晨执行（按服务器本地时区；确认目录和用户权限）：

```cron
15 3 * * * cd /opt/java-interview-site && bash deploy/backup.sh >> backups/cron.log 2>&1
```

设置 cron 前先 mkdir -p backups。备份默认不自动删除，定期归档并检查磁盘空间。

恢复会覆盖数据库，先做新备份，并恢复与备份兼容的应用版本：

```bash
bash deploy/restore.sh backups/20261013T000000Z
```

校验文件通过后必须输入 RESTORE。图片文件从备份覆盖；未引用的旧图片可能仍保留在卷中。
恢复全部成功后才启动后端；任何步骤失败时保持后端停机，排查并重新完成恢复后再启动。首次部署验收时，在单独测试环境完成一次备份/恢复演练。

## 6. 更新与回滚

发布新版本前备份，再上传源码（保留 .env、Docker 卷和部署配置），执行 docker compose up -d --build。
保存每次发布的源码压缩包或 Git 提交及构建镜像，便于回滚。
普通回滚使用上个应用版本；涉及数据库结构变更须确认旧版本兼容性，必要时使用对应数据库备份。
当前迁移版本为 V8；后续结构变更追加 V9 及更高版本文件，不修改已经执行的迁移。V8 把审核表的 evidence 列统一为 MySQL 8.4 与 H2 都支持的 MEDIUMTEXT。
docker compose down 保留卷；不要使用 down -v，后者会删除题库和图片。

## 验收清单

- HTTPS 登录、退出、改密正常；重置密码会使旧会话失效。
- 题库初始内容导入一次，重启保留管理员修改和主动删除。
- 电脑、390px 和 320px 手机可以搜索、看答案、打开旧链接和跨页切题。
- 管理员新增、编辑、删除题目及回答；移动题目后可以归档空模块。
- 普通账号无法调用管理接口。
- AI 未启用、请求失败和重试有明确反馈；采用 AI 回答须经过编辑及手动保存。
- 知识上传、检索、删除与向量构建正常；密钥不返回浏览器。
- 数据库及图片备份成功，恢复失败保持停机，并在测试环境完成恢复演练。

阅读页已提供先答再看、自评、收藏与个人笔记入口；数据管理页已提供题库/资料/学习记录/完整备份导出与 Markdown 预览导入，业务库审核结论也有独立面板。legacy 参考文档（`/api/documents` 系列）仍只有接口与导出，没有独立编辑页。历史数据与兼容接口仍保留。
测试命令与范围见 [测试指南](./testing.md)，AI 配置见 [AI 与 RAG](./ai-rag.md)。

## 运行诊断与内容审核

管理员可读取 `/api/admin/metrics` 的聚合计数、耗时和可用 AI 槽位，不返回密钥、提示词或账号标识。`/api/admin/publications/status` 对比业务库答案与发布基线，列出人工答案差异；只读，不执行覆盖。内容审核台账见 `content/explanations/review-ledger.json`。

[接口契约](../openapi.json)明确摘要/详情、管理员边界、CSRF、版本冲突、容量及超时语义。普通列表不再用于全量备份；`snapshot-question-bank.ps1` 已切换为管理员完整快照接口。
