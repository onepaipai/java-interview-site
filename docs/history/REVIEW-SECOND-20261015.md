> 历史记录：描述当时的审查范围与结论，不代表当前标准或完成度。现行标准见 [回答审查标准](../../content/explanations/REVIEW-STANDARD.md)，当前说明见 [文档导航](../README.md)。

# 题目回答第二轮审查

审查时间：2026-10-15 12:37:41（Asia/Shanghai）。本报告复审当前全量题包、实际网站回答、生成逻辑及现有阅读截图。

## 结论

**整批内容验收暂不通过。** 四段结构和发布一致性通过；已确认多处分析、案例、总结没有对应当前题目，库存样例的上轮问题也未补齐。现有卡片与单图排版总体清楚，320px 顶栏标签拆行仍需处理。

本轮对 1,215 份文件做全量结构和摘要检查，重点抽看 34 题的分析、案例和总结，覆盖 21 个模块。没有宣称全部 1,215 题的技术事实均已人工逐条核验。

## 已核对的事实

| 项目 | 结果 |
| --- | ---: |
| 清单与生成文件 | 1,215，集合一致，无缺失或额外文件 |
| 正文 SHA-256 与清单 | 1,215 份一致 |
| 网站有效题目 | 1,216 |
| 网站与本次清单回答完全一致 | 1,215 |
| 网站空回答 | 0 |
| 四段顺序、编号、长度和案例基本结构 | 1,215 份通过独立检查 |
| 包含代码的题解 | 70 |
| 正式题包图引用 | 22，仅使用 3 个 SVG |
| 不同的“分析＋案例＋总结”正文组合 | 251 |
| 被多题原样共享的组合 | 226 组，涉及 1,190 题 |

重复本身不等于错误：紧密相关题可以共用机制说明。但每题案例要验证该题的关键差异，总结要能帮助回答该题。下列案例已能确认错配，不能仅以格式检查通过或覆盖率 100% 判定内容合格。完整重复组及待审题目见 [机器可读证据](REVIEW-SECOND-20261015.json)。

## 逐项问题与改法

P1：影响当前内容验收，需要修订。P2：知识精度或阅读排版需要完善。

### R01 · P1

**位置**：[scripts/build-explanations.mjs](../../scripts/build-explanations.mjs)，第 86 行附近。

**问题**：生成器按 topic 整体复用分析、案例和总结，不能保证逐题对应。

**改法**：参考分析、案例和总结增加题目级内容；共用机制可保留，但案例必须验证当前题的关键差异，总结必须回答当前题。

### R02 · P1

**位置**：[content/explanations/generated/java-language-18.md](../../content/explanations/generated/java-language-18.md)，第 18 行附近。

**问题**：Lambda 有效 final 题，分析谈 Stream 终止操作，案例谈订单聚合，总结是“重复键先定规则”。

**改法**：用捕获局部变量后重新赋值的编译错误，与修改所引用对象内容的对照案例；总结聚焦局部变量约束和对象可变性。

依据：[官方规范或项目文档](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.27.2)。

### R03 · P1

**位置**：[content/explanations/generated/spring-advanced-9.md](../../content/explanations/generated/spring-advanced-9.md)，第 11 行附近。

**问题**：事务事件阶段题未列出四种阶段及默认阶段；案例改成独立审计事务，不能说明如何选择事件阶段。

**改法**：分点列 BEFORE_COMMIT、AFTER_COMMIT（默认）、AFTER_ROLLBACK、AFTER_COMPLETION；用提交成功发通知与回滚记录失败的对照场景，并补无事务时默认不执行及 fallbackExecution。

依据：[官方规范或项目文档](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)。

### R04 · P1

**位置**：[content/explanations/generated/algorithms-2.md](../../content/explanations/generated/algorithms-2.md)，第 23 行附近。

**问题**：LFU 同频淘汰题的案例先读 A，再放 C，淘汰时 A/B 频次不同，没有覆盖“同频”这个题眼。

**改法**：先用 A、B 同频后插 C 验证桶内最旧淘汰，再用 get 提频验证 minFreq 更新；给出最小实现或关键伪代码和复杂度。

### R05 · P1

**位置**：[content/explanations/generated/legacy-93.md](../../content/explanations/generated/legacy-93.md)，第 17 行附近。

**问题**：B+ 树与 B 树、红黑树、哈希比较题，分析和总结却在讲统计信息、LIMIT 与超级大户查询。

**改法**：按扇出与层数、叶子有序与范围访问、等值定位三个点比较；案例围绕页读取和范围查询，总结保留这三个差异。

### R06 · P1

**位置**：[content/explanations/generated/legacy-95.md](../../content/explanations/generated/legacy-95.md)，第 17 行附近。

**问题**：MVCC/Read View 题复用了死锁、写偏斜和排班医生案例，没有演示历史版本可见性。

**改法**：用两个事务交错读写同一行，按 RC/RR 标出快照建立时机和各次读取值；解释 Read View 与 undo 版本链，总结围绕“谁能看见哪个版本”。

依据：[官方规范或项目文档](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)。

### R07 · P1

**位置**：[content/explanations/generated/network-1.md](../../content/explanations/generated/network-1.md)，第 26 行附近。

**问题**：HTTPS 请求阶段题混入“设计长度或分隔协议”，总结“字节流自行定界”，把自定义 TCP 协议案例套到 HTTP。

**改法**：按 DNS、建连、TLS、发送、服务处理分段计时；HTTP/1.1 消息定界遵循协议既定规则，不建议自行设计分隔协议。总结保留阶段耗时和连接复用。

依据：[官方规范或项目文档](https://www.rfc-editor.org/rfc/rfc9112.html#section-6)。

### R08 · P1

**位置**：[content/explanations/generated/legacy-112.md](../../content/explanations/generated/legacy-112.md)，第 17 行附近。

**问题**：线程安全单例、生产者消费者复合题，分析混入双队列模拟栈，案例验证“连续 pop 后最小值”，且没有单例案例。

**改法**：分别给单例安全发布与有界阻塞队列两段最小片段；验证实例唯一、满/空阻塞、关闭和中断，删去最小栈内容。

### R09 · P1

**位置**：[content/explanations/generated/database-advanced-26.md](../../content/explanations/generated/database-advanced-26.md)，第 30 行附近。

**问题**：上次指出的幂等步骤仍缺失：案例只有条件 UPDATE，却直接承诺重复请求不会再次扣减；样例源文件也未修改。

**改法**：补“事务内先插入 request_id 唯一记录，再扣库存；失败整笔回滚，重复请求在事务结束后查原记录并核对参数”；注明 SQL 为框架绑定的具名参数语句。

### R10 · P2

**位置**：[content/explanations/generated/jvm-advanced-4.md](../../content/explanations/generated/jvm-advanced-4.md)，第 28 行附近。

**问题**：Humongous 题未给出半 Region 阈值，末尾总结“暂停目标不是承诺”偏向另一题。

**改法**：补 Java 17 下对象大小达到半个 Region 的界定及连续老年代 Region、尾部浪费/碎片风险；总结改为“大对象按 Region 算，连续空间要关注”。

依据：[官方规范或项目文档](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-garbage-collector1.html)。

### R11 · P1

**位置**：[content/explanations/generated/ai-basics-12.md](../../content/explanations/generated/ai-basics-12.md)，第 18 行附近。

**问题**：余弦与欧氏距离选择题，分析、图和总结全是通用 RAG 证据流程，未比较两种度量。

**改法**：用同一查询和两条向量比较排序；指出单位归一化后平方欧氏距离与余弦的关系，未归一化时可能排序不同。此题可去掉通用 RAG 图。

依据：[官方规范或项目文档](https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances)。

### R12 · P1

**位置**：[content/explanations/generated/java-language-13.md](../../content/explanations/generated/java-language-13.md)，第 18 行附近。

**问题**：finally return 题套用资源关闭异常案例，未实际演示返回或异常被覆盖；“资源关闭异常保存在 suppressed”缺少 try-with-resources 等条件。

**改法**：先用 try 抛异常/finally return 的最小对照展示结果覆盖；若保留 suppressed，注明 try-with-resources 中已有主异常的条件。

依据：[官方规范或项目文档](https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.20.3)。

### R13 · P1

**位置**：[content/explanations/generated/legacy-64.md](../../content/explanations/generated/legacy-64.md)，第 23 行附近。

**问题**：synchronized 锁升级题复用了限时可重入锁、公平/非公平与排队案例，难以解释监视器实现和版本差异。

**改法**：保留按 JDK 版本区分的回答，案例改为同一监视器下无竞争/有竞争及持锁时间观测；删除不对应的公平锁与限时锁分支。

### R14 · P2

**位置**：[frontend/src/theme.css](../../frontend/src/theme.css)，第 16 行附近。

**问题**：320px 阅读页截图中，顶栏“题库”“知识模块”等标签被拆行，导航视觉拥挤。

**改法**：给导航短标签禁止断行，配合紧凑间距、横向滚动或更多菜单；重新验证 320px/390px 的文字与触摸区域。

## 排版与图表复核

已查看六张现有截图：桌面工作台、390px 工作台、320px 工作台、桌面 RAG、320px RAG 和 320px 紧凑题解。

1. 四段分区、结论与总结的底色、编号和段间距清楚；没有发现同题堆放多张图。
2. 桌面图与案例分栏，手机恢复纵向顺序；图表依附对应步骤，现有样式可以保留。
3. 代码块独立，长行在块内查看；不建议通过缩小整页字号来容纳代码。
4. 320px 顶栏导航将“题库”“知识模块”等短标签拆行，截图中可见拥挤，应调整后复测。
5. 个别整页截图的吸顶栏停在正文中部；当前图片不宜直接作为最终展示图，应回到顶部后重新采集。不能仅凭这一截图现象判定实际运行时导航错位。
6. 三个图资源已重新实际请求，均返回 HTTP 200 和 image/svg+xml。图资源可访问不代表点击放大等交互已重测。

本轮尝试重新打开浏览器，工具返回 iab 不可用且浏览器列表为空。因此没有重跑浏览器操作、复制和放大交互；现有截图及 pack-audit.json 仅作为已有证据，没有冒充本轮执行结果。

## 校验过程说明

1. 全量重新读取清单与正文，核对文件集合及每份 SHA-256；重新读取网站全部有效题，按来源键与摘要匹配。
2. 独立检查四个标题、顺序、编号、点数、单点长度、案例结果关键词、代码围栏及占位语；未发现结构项异常。
3. 原 validate-explanations.mjs 在本工具的模块运行环境中触发数组比较断言，但两侧序列化内容完全相同，文件集合也没有差异。未把此运行环境现象认定为项目缺陷，改以独立集合与结构核对记录结果。
4. 本轮没有执行会重写生成文件的 build-explanations.mjs，没有修改回答、生成器、前端或数据库。只新增复审报告及证据文件。
5. Java、Spring、MySQL、HTTP 和向量度量的相关结论已按报告对应官方资料核对；Java/SQL 案例没有在本轮重新编译或连接真实 MySQL 执行。

## 修订顺序

1. 先修正 R02–R13 的明确错配与关键前提，不能仅替换章节标题。
2. 处理 R01 的生成粒度：分析、案例、总结有题目级内容，避免修好一题后同 topic 的其他题仍错配。
3. 按机器证据中的重复组逐题甄别；合理复用保留，无关套用重写。不以“共用率”为唯一判错标准。
4. 补上关键反例：Lambda 重赋值、LFU 同频、RC/RR 交错读取、事务事件各阶段、条件扣减与请求去重。
5. 重新生成和验证后，按既有升级流程核对网站实际回答；最后重测桌面、390px、320px 的目录、代码与图表。

## 快照信息

- 清单 SHA-256：`c3095d67313a50bcd79951fb15f435f6c1e94c4638a1dcca57cd3b8b4a0d9bdb`。
- 写报告时清单仍与本轮初始读取一致：是。
- 逐项文件摘要、34 题抽查清单及 226 个重复候选组保存在 [REVIEW-SECOND-20261015.json](REVIEW-SECOND-20261015.json)。
- 上轮报告保留历史记录；当前验收状态以本轮已核对的范围和问题为准。
