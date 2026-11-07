# 事务代理为什么会在同类自调用时失效？

<!-- source: senior-v1/spring-advanced/1 -->

Spring 默认代理模式 · [代理边界](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) · [回滚规则](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html)

## 参考回答

1. 事务配置由代理拦截执行；同类 this 调用不重新经过代理。
2. 自调用方法上的传播属性和回滚配置不会在该调用处生效。
3. 需要独立事务边界时，拆分事务 Bean，或使用 TransactionTemplate。
4. 外层已有同资源事务时，内部操作仍可参与；不能一概说“完全无事务”。

## 参考分析

1. 正常路径是调用方 → 事务代理 → 目标方法；代理负责事务的进入和结束。
2. this 调用直接进入目标方法；内部注解不会因此触发事务拦截。
3. REQUIRES_NEW 同样依赖拦截；同类自调用不会自动开启独立事务。
4. 默认回滚包括 RuntimeException、Error；受检异常通常要显式配置。
5. 测试外层事务可能掩盖问题；从无事务入口调用，再独立查库验证。

## 案例

1. 场景：外层 checkout 没有事务，自调用 insertAndFail；写入后抛出运行时异常。
2. 现象：普通自动提交连接已写入，注解未触发回滚；本地案例残留 1 条记录。
3. 流程：下图只展示该失败路径，前提是外层没有事务。

![自调用事务失效路径：无事务入口直接进入内部注解方法，未重新经过代理](/explanations/transaction-self-call.svg)

4. 修复：把写入移到独立 Bean，由容器注入代理后调用。以下是两个 Bean 的核心方法。

```java
// CheckoutService：外部编排
public void checkout(long id) {
    writer.insertAndFail(id); // writer 是容器注入的 OrderWriter 代理
}

// OrderWriter：独立事务边界
@Transactional
public void insertAndFail(long id) {
    jdbc.update("INSERT INTO demo_orders(id) VALUES(?)", id);
    throw new IllegalStateException("模拟失败");
}
```

5. 验证：异常穿出事务方法后查库，修复路径残留 0 条。
6. 边界：自行 new Bean 不等价于注入代理；数据库事务也不自动覆盖远程通知。

## 总结点

1. 事务看代理，自调用不拦截。
2. 外层有事务，内层可参与。
3. 拆服务或用模板，查库验回滚。
