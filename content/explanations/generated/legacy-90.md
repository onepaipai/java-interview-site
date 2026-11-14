<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 ORM 沙盘:MyBatis 的执行流程(SqlSession→Executor→StatementHandler→ResultSetHandler)+一级缓存(SqlSession 级)+二级缓存(Namespace 级)+延迟加载(代理+按需加载关联)。

1. 执行流程:SqlSessionFactory→SqlSession→Executor(Simple/Reuse/Batch)→StatementHandler(建 Statement+参数)→数据库→ResultSetHandler(映射为对象)——Mapper 接口=JDK 动态代理(MapperProxy 把方法调用转为 SqlSession 操作)。
2. 一级缓存:SqlSession 级(默认开启,同一 SqlSession 的相同查询命中缓存)——作用域小(一次数据库会话);Spring 整合后每请求新 SqlSession→一级缓存几乎无效(每次新会话);清空条件:增删改/close/clearCache。
3. 二级缓存:Namespace 级(跨 SqlSession,默认关闭,需 <cache> 开启)——序列化存储(对象要实现 Serializable);风险:多表查询时脏读(A 表更新不会清 B 表的 Namespace 缓存)——推荐关闭二级缓存,用 Redis 等外部缓存替代(可控性更好)。
4. 延迟加载:关联对象(association/collection)在首次访问时才加载(代理+CGLIB/Javassist)——aggressiveLazyLoading(默认 false,调用任何方法即触发加载)vs 按需加载(访问关联属性才触发)——延迟加载的 N+1 问题(循环触发 N 次查询,第 29 题 MyBatis 延迟加载)。

## 参考分析

### 机制:一级缓存的"会话级"设计

一级缓存的 key=statement ID+参数+分页+SQL——同一 SqlSession 的相同查询命中缓存(避免重复查 DB);Spring 整合后 SqlSession 的生命周期=请求(每次请求新建)→一级缓存只在"同一请求内的相同查询"生效;增删改清空缓存(防止脏读)。

### 反例:MyBatis 缓存的两种事故

事故一:二级缓存的脏读——Namespace A 的缓存被 Namespace B 的更新污染(多表 JOIN 的缓存失效问题);修复=关闭二级缓存或确保单表操作。事故二:N+1 查询——延迟加载的关联在循环中逐个触发查询(100 条记录×每次关联查询=N+1 次);修复=JOIN 一次查询或 BatchExecutor(第 29 题 MyBatis)。

### 取舍:MyBatis vs JPA 的选型

MyBatis:SQL 可控(手写 SQL)+动态 SQL 灵活(<if>/<foreach>)+学习成本低——适合复杂查询/报表/SQL 优化;JPA:对象关系映射自动化+数据库无关——适合简单 CRUD+对象模型清晰;混合使用:复杂查询用 MyBatis,简单 CRUD 用 Spring Data JPA(共存可行)。

## 案例

### 验证:MyBatis 的走查核对

验证:执行流程断言(MapperProxy 动态代理→SqlSession→Executor→DB);一级缓存断言(同 SqlSession 相同查询只执行一次 SQL);二级缓存风险断言(多表更新后缓存脏读);延迟加载断言(未访问关联属性→不触发 SQL;访问后触发)。验证:MyBatis 的断言可程序化(SQL 日志计数+缓存命中统计)。

### 追问链:MyBatis 三刀

一刀:"#{} 与 ${} 的区别?"——#{}=PreparedStatement 参数(防 SQL 注入);${}=字符串替换(有 SQL 注入风险——仅用于表名/列名等非值场景,且白名单校验,第 48 题数据库)。二刀:"Mapper 接口的原理?"——MapperProxy(JDK 动态代理)将接口方法映射为 SQL(MapperMethod 解析注解/XML)→SqlSession 执行——接口无需实现类(代理实现)。三刀:"批量操作?"——ExecutorType.BATCH(批量提交,减少网络往返)+foreach 标签(SQL 拼接,注意 SQL 长度限制)——批量插入的两种方式与性能对照(第 39 题批处理)。

## 总结点

1. SqlSession→Executor→Statement→ResultSet
2. 一级缓存会话级,二级 Namespace 级
3. 延迟加载防 N+1,批量查询替代
