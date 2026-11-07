# 7–10 年 Java 开发经典题包

版本：senior-v1。21 个现有模块，每模块新增 50 道题，共 1,050 道独立题目，均附参考要点。重点考察机制理解、约束分析、架构取舍、并发一致性、线上诊断和故障恢复。内容为按主题编写的面试练习，不宣称来自特定公司的真实面试。

基础与进阶同主题模块侧重点不同：基础关注契约、边界和误用，进阶关注实现、性能、复杂故障与系统协作。参考要点用于复习与口述展开，系统设计题还需结合题设给出容量估算、流程、数据模型和失败路径。

| 模块 | 题数 | 文件 |
| --- | ---: | --- |
| Java 语言 | 50 | [java-language.tsv](java-language.tsv) |
| 集合 | 50 | [collections.tsv](collections.tsv) |
| 并发基础 | 50 | [concurrency-basics.tsv](concurrency-basics.tsv) |
| JVM 基础 | 50 | [jvm-basics.tsv](jvm-basics.tsv) |
| Spring 基础 | 50 | [spring-basics.tsv](spring-basics.tsv) |
| 数据库基础 | 50 | [database-basics.tsv](database-basics.tsv) |
| 网络与其他 | 50 | [network.tsv](network.tsv) |
| AI 基础 | 50 | [ai-basics.tsv](ai-basics.tsv) |
| 并发进阶 | 50 | [concurrency-advanced.tsv](concurrency-advanced.tsv) |
| JVM 进阶 | 50 | [jvm-advanced.tsv](jvm-advanced.tsv) |
| Spring 进阶 | 50 | [spring-advanced.tsv](spring-advanced.tsv) |
| 数据库进阶 | 50 | [database-advanced.tsv](database-advanced.tsv) |
| 缓存与消息队列 | 50 | [cache-messaging.tsv](cache-messaging.tsv) |
| 手写与算法 | 50 | [algorithms.tsv](algorithms.tsv) |
| AI 进阶 | 50 | [ai-advanced.tsv](ai-advanced.tsv) |
| 网银业务核心 | 50 | [banking.tsv](banking.tsv) |
| 分布式与高并发 | 50 | [distributed.tsv](distributed.tsv) |
| 线上稳定性 | 50 | [reliability.tsv](reliability.tsv) |
| 架构与工程 | 50 | [architecture.tsv](architecture.tsv) |
| AI 落地 | 50 | [ai-production.tsv](ai-production.tsv) |
| 专家级：系统设计与架构 | 50 | [system-design.tsv](system-design.tsv) |

## 导入与维护

应用启动时读取与 Java.md 同目录下的 senior/manifest.json，新数据库和已有数据库均适用。原 Java.md 不改写，原题不覆盖。每道题以题包版本、模块 ID、固定序号产生稳定来源标识；重复启动跳过已有记录，管理员后续修改与主动删除也保持原样。新增题排在相应模块现有题之后，标签包括“7–10 年”“经典面试”“senior-v1”。

TSV 每行是“题目 + 制表符 + 参考要点”，固定顺序即题目身份的一部分。已发布题包不要插入、删除、调换行号；内容演进应明确版本和迁移策略。模块更名后沿用已有题的模块身份，已归档模块不会被偷偷重建。手动移走已有题也不会在下次启动被自动移回。

导入前完整校验所有文件，再在一个事务中添加；不会因最后一个文件错误而留下前面已导入的半包。现有部署缺失题包文件时不会凭空生成题目，因此发布时必须连同整个 content 目录上传。

验证命令：项目根目录执行 node scripts/validate-content.mjs。检查 21×50、题名唯一、答案长度和占位内容；后端回归另验证实际落库数量、重复导入和编辑保留。

## 参考资料与版本边界

manifest.json 为每个模块列出延伸资料。题目围绕通用机制与工程判断组织，涉及实现的答案须结合目标版本核对；Java 17 项目中的虚拟线程等题用于版本演进讨论，不意味着此项目启用了更高 JDK 功能。

- [Java 语言规范](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)、[Java 内存模型](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)、[Java 并发 API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)。
- [JVM 规范](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)、[垃圾回收实现与选择](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)。
- [Spring Bean 作用域](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)、[声明式事务与代理边界](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)。Spring 在线文档版本可能高于本项目，具体 API 以项目依赖版本为准。
- [MySQL 8.4 事务模型](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)、[查询优化](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)。
- [Redis 分布式锁](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)、[缓存淘汰](https://redis.io/docs/latest/develop/reference/eviction/)、[Kafka 设计](https://kafka.apache.org/41/design/design/)。
- [HTTP 语义 RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)、[Raft 论文](https://raft.github.io/raft.pdf)、[Google SRE](https://sre.google/sre-book/table-of-contents/)。
- [RAG 原论文](https://arxiv.org/abs/2005.11401)、[Transformer 原论文](https://arxiv.org/abs/1706.03762)、[LoRA 原论文](https://arxiv.org/abs/2106.09685)、[OWASP 提示注入风险](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)。
