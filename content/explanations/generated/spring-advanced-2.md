<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 同一 JDBC 事务管理器下，REQUIRED 通常加入外层事务并复用连接；REQUIRES_NEW 另开独立事务。
2. 外层挂起后连接和锁通常仍占用；内层既可能耗尽连接池，也可能等外层持有的行锁。
3. 只有确需独立提交才用 REQUIRES_NEW；容量按并发与嵌套核算，不能靠盲目扩池解决事务边界问题。

## 参考分析

1. 前提是调用经过代理或编程式事务边界；同类自调用时传播注解可能没有被拦截，不能据此推断连接数。
2. 一次一层、每层至多一条连接的简化模型下，N+1 可让一个内层先完成以取得进展，但不保证吞吐，也不涵盖多层嵌套。
3. 内层独立提交后，外层回滚不会撤销它；把业务明细写成 REQUIRES_NEW 可能产生主单不存在而明细已提交的孤立数据。
4. 挂起不等于释放锁：外层锁住某行，内层另用连接更新同一行，可能被自己挂起的外层阻塞，池再大也治不好。
5. NESTED 常基于同一物理事务的保存点，不等于独立提交；不能为了省连接就把两者直接替换。

## 案例

1. 场景（教学示例）：池大小 10，10 个请求都在外层事务执行过 SQL，再经另一 Bean 调 REQUIRES_NEW 审计方法。

2. 复现：测试中用屏障保证 10 个外层都借到连接，再同时进入内层；审计写独立表，先排除行锁干扰。

```text
T1..T10：外层各占 1 条连接 → 共占满 10 条
T1..T10：挂起外层 → 外层连接仍保留
T1..T10：内层申请第 2 条连接 → 全部等待
连接池获取超时 → 内层失败；异常传播决定外层是否回滚
```

3. 结果：active=10、idle=0，内层等待连接数上升；在该简化模型下临时增加 1 条可打破池等待，但不是最终容量方案。

4. 反例验证：让外层和内层改同一行；若内层仍锁等待，应重划事务边界；另测内层成功后外层失败，确认独立审计确实被保留。

## 总结点

1. REQUIRED 通常复用连接。
2. 新事务要连接，旧事务仍占用。
3. 挂起事务不会释放行锁。
