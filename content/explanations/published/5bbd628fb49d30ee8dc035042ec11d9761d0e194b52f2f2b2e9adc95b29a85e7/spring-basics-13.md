<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银查询沙盘:@Transactional(readOnly=true) 的方法里执行 UPDATE——Spring 的 readOnly 是"提示"非"强制":Hibernate 设置 FlushMode.MANUAL(ORM 层拦截);JDBC 层 setReadOnly(驱动可选);但直接 JDBC UPDATE 不受 ORM 拦截。

1. readOnly 的三个层面：ORM 的 FlushMode.MANUAL 影响自动 flush；JDBC 的 setReadOnly 可能执行 SET SESSION TRANSACTION READ ONLY；Spring 只是设置这些语义，是否下传取决于配置。
2. JdbcTemplate/原生 SQL 会绕过 ORM；MySQL InnoDB 的会话级只读在真正设置后会拒绝写入，但 Spring readOnly 不应当作权限防线。
3. 正解:readOnly=true 用于"语义声明"(优化提示)——不用于"安全防护"(安全靠权限,第 18 题 方法级授权)。

## 参考分析

### 机制:readOnly 的三层

ORM 层(Hibernate FlushMode.MANUAL)/JDBC 层(setReadOnly,MySQL 驱动会执行 SET SESSION TRANSACTION READ ONLY)/Spring 层——三层都是提示非强制,是否传递到 Connection 取决于配置。因此 readOnly 的效果随驱动与方言而异,切换数据源需重新验证,不可当作跨库保证。

### 反例:readOnly 不阻止写入

JdbcTemplate UPDATE 在 readOnly 事务内成功——绕过 ORM 的写入不受拦截。结论:写入防护靠权限与 SQL 审计,readOnly 只作优化提示与语义声明,不承担防线职责。

### 取舍:readOnly 的定位

语义声明加性能优化提示,不用于安全防护——安全靠权限体系。审查时把 readOnly 当性能线索而非防线,读库路由、超时与权限才是读保护的主体——语义声明不承担安全职责。

## 案例

### 验证:readOnly 的断言组

验证:JdbcTemplate 断言(readOnly=true 内 JdbcTemplate UPDATE 成功——不阻止);Hibernate 断言(Session 的 save 在 readOnly 下 flush 时不写入——ORM 层拦截);对照断言(无 readOnly 的 UPDATE 正常)——三组固化 readOnly 的语义边界。

### 追问链:readOnly 三刀

一刀:"readOnly 的性能收益?"——Hibernate 关闭脏检查(节省快照内存与比较时间)+驱动优化(只读事务不加锁)——性能收益是真实但依赖实现。二刀:"readOnly 与复制路由?"——readOnly 事务路由到从库(读写分离的路由依据)——readOnly 的路由价值(第 36 题 distributed 跨机房读)。三刀:"readOnly 的 Spring Data?"——Spring Data JPA 的 @Query(readOnly=true)/CrudRepository 的 findById(默认只读)——框架层的 readOnly 传播。

## 总结点

1. readOnly 是提示非强制
2. ORM 层拦截 JDBC 不拦
3. 语义声明,不用于安全
