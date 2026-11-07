<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 优先限制新增负载并定位持有连接的慢事务或泄漏，避免无限加连接压垮数据库。
2. 保留在途事务处理和恢复验证。

## 参考分析

1. 扩容应用可能把数据库压得更重。
2. 超时请求后台继续执行会扩大在途量。
3. 熔断恢复期必须限速探测。

## 案例

1. 场景（教学示例）：依赖变慢后连接与线程池相继耗尽。
2. 处理：限流非核心入口，传播取消，检查最老任务与 SQL；下游恢复后分阶段放量。

3. 验证：资源逐步释放且核心请求恢复；根因由同一时间线证据支持。

## 总结点

1. 资源满先查谁占用。
2. 恢复也要限制流量。
