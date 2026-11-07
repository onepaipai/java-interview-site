<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [java.testcontainers.org · 1](https://java.testcontainers.org/modules/databases/mysql/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html)

</details>

## 参考回答

1. H2 启动快，适合窄范围 SQL、代理与事务边界实验；它不是 MySQL 等目标引擎行为的完整替身。
2. Testcontainers 可在隔离容器运行指定引擎，验证迁移、类型、方言和并发行为，但需要可用容器环境及明确生命周期。

## 参考分析

1. 兼容模式不保证锁、隔离、索引和 DDL 完全一致；测试应固定版本并核对数据库元信息。
2. 容器启动成功也不代表全部场景已覆盖，需要控制提交顺序和故障；跳过不能当作通过。

## 案例

1. 教学场景：H2 查询与回滚通过，MySQL 上唯一约束竞争行为不同。

2. 保留快速 H2 用例，将迁移与竞争放到一次性目标库，用两个连接组织真实事务。

3. 验证引擎版本、SQL 与最终数据，容器不可用时记录未验证，禁止回退到日常数据库测试。

## 总结点

1. 内存库验证窄范围机制。
2. 引擎行为在隔离目标库验证。
