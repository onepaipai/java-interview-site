<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 同时扩容会叠加连接建立、缓存预热、全表读取和迁移负载；启动成功不代表下游能承受集中准备动作。
2. 把全局数据库变更放入受控发布步骤，实例准备只做必需工作；预热分批、限速并限制同时启动数。
3. 就绪探针在必需准备完成后放量；失败可停止扩容并回退，不能让探针自身执行昂贵全量扫描。

## 案例

1. 场景（教学示例）：20 个副本同时启动，每个都全表预热并建立完整连接池。

2. 处理：迁移由受控步骤先完成，副本分批启动；限制预热并发和连接增长，观测数据库连接数、锁等待与就绪耗时。

3. 预期：单批失败不会触发剩余副本继续冲击；核心服务的连接余量可保留。仅把重复初始化搬到另一个生命周期回调不能降低总负载。

## 总结点

1. 迁移与实例扩容分开。
2. 预热和连接增长都要限速。
