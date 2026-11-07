<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)

</details>

## 参考回答

1. 单例 Bean 由请求共享，Spring 不会自动串行化方法；成员字段里的身份可能被另一个请求覆盖。
2. 租户、用户等请求状态放进方法参数和局部变量；身份必须来自认证结果，不能直接相信请求体。
3. volatile 只解决可见性，不隔离请求；分别给 setter 和业务方法加锁也保护不了整个请求序列。
4. 同步请求可用 request scope；异步显式传入不可变上下文，不假定请求结束后作用域仍有效。
5. 共享缓存和统计另做并发与租户隔离；ThreadLocal 必须考虑线程池清理和跨线程传递。

## 案例

1. 场景（教学示例）：单例导出服务先 setTenant 再 export；A、B 请求交错，A 导出了 B 的数据。

2. 处理：删除共享 tenant 字段，从认证层传入不可变上下文，并在 SQL 中保留租户条件。

```java
record Caller(String tenantId, String userId) {}
class ExportService {
    String tenantForExport(Caller caller) {
        // caller 由认证层构造；查询仍需按 tenantId 过滤
        return caller.tenantId();
    }
}
var service = new ExportService();
System.out.println(service.tenantForExport(new Caller("A", "u1")));
System.out.println(service.tenantForExport(new Caller("B", "u2")));
```

3. 结果：输出 A、B；同一服务实例不再保存上一次请求身份，异步导出也只传本次调用的上下文快照。

4. 验证：让 A 在参数校验后暂停，完成 B 再恢复 A；检查 SQL 租户参数及导出文件归属均为 A，另测线程池复用。

## 总结点

1. 单例共享，不会自动串行。
2. 请求状态放入调用参数。
3. 身份可信，查询仍需隔离。
