<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)
- [github.com · 2](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)

</details>

## 参考回答

1. 请求不都在同一时刻访问数据库，数据库也不能无限并行执行。连接池应服从全实例数据库连接与执行能力预算，而非照抄 Web 线程数。
2. 按事务占用时长、并发访问、排队等待和目标吞吐实测调整；过大可能增加竞争，过小可能使请求长时间等待。

## 参考分析

1. 多个实例的池上限加后台任务和管理连接才是总预算；自动扩容时还需为数据库保留余量。
2. 嵌套独立事务可能同时需要额外连接；慢 SQL 和事务内远程等待应先修复，不能只把池开大。

## 案例

1. 教学场景：Web 有 200 个线程，四个实例各开 200 个数据库连接，数据库出现拥塞。

2. 统计全实例活跃连接、等待时间、事务时长和数据库负载，用隔离压测逐档比较池大小并收紧等待预算。

3. 验证超时与吞吐满足目标且数据库留有余量；记录扩容后总预算，不给出脱离负载的固定最佳连接数。

## 总结点

1. 池预算按数据库和全实例计算。
2. 先排查慢事务再调容量。
