<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银交易沙盘:@Transactional 不生效——自调用绕过代理/方法非 public/类被 new 出来/异常被捕获不回滚/传播行为误配/多数据源管理器错配——spring-basics/advanced 的完整汇总版。

1. 六大失效:一,自调用(this.pay() 绕过代理——spring-advanced 1 题实测);二,方法非 public(Spring 6 不读非 public 注解);三,类不是 bean(new 出来的无代理);四,异常被吞(默认只回滚 RuntimeException);五,传播误配(NOT_SUPPORTED 挂起);六,事务管理器绑错数据源。
2. 排查顺序:打印 getClass().getName()(含 CGLIB/$Proxy=代理路径)→查方法可见性(public)→查 bean 来源(容器交付还是 new)→查异常处理(是否捕获)→查传播行为与事务管理器绑定(spring-advanced 6 题的排查顺序)。
3. 最佳实践:@Transactional 方法 public+由容器交付(不 new)+不自调用(拆 bean 或 ObjectProvider)+事务方法只做 DB 操作(不夹 RPC,第 10 题分布式事务)+rollbackFor 显式声明(不依赖默认规则的记忆)。

## 参考分析

### 机制:事务是 AOP 代理实现的

@Transactional 的生效=TransactionInterceptor 拦截(调用必须经过代理)——自调用 this.pay() 不经过代理(拦截器不在调用链上)→事务开关没执行;new 出来的对象没有经过容器的 BPP→无代理→注解是摆设——"注解本身永远没错,错在调用路径"(spring-advanced 6 题)。

### 反例:事务失效的两种事故

事故一:同类内调用@Transactional 方法——事务不生效(自调用绕过代理,spring-advanced 1 题实测=0);修复=拆 bean/ObjectProvider/self-injection/AopContext。事故二:catch 后不标 rollback——内层 catch 异常不传播→外层不知道该回滚→部分提交(脏数据);修复=catch 后 setRollbackOnly 或重新 throw。

### 取舍:事务边界的设计

事务方法薄(只做 DB 操作)+业务逻辑下沉(无注解的内部方法)+远程调用移出事务(第 39 题事务长度)——事务边界的设计=缩小事务范围(短事务,连接占用少,锁持有短,banking 7 题锁序)。事务不是"加个注解"就完了,是"边界设计"的一部分。

## 案例

### 验证:事务失效的走查核对

验证:spring-advanced 1 题实测(自调用事务生效=0,代理调用=1)+28 题(PostConstruct 捕获=裸类)+6 题(排查入口 this.getClass().getName());验证:每个失效场景的断言可程序化(事务标志=TransactionSynchronizationManager.isActualTransactionActive)。

### 追问链:失效三刀

一刀:"@Transactional 加在类上?"——类级对全部 public 方法生效;方法级覆盖类级;接口上的注解在 CGLIB 模式不生效(代理不是接口实现)——注解放实现类。二刀:"Spring 6 对非 public 的 warn?"——启动日志有 warn(非 public 方法的事务注解被忽略)——很多团队日志级别看不到 warn;静态检查(ArchUnit)更可靠。三刀:"事务管理器选错?"——事务"正常开关"但管的是另一个数据源——最难排查的形态(多数据源必须显式绑定 TransactionManager,spring-advanced 7 题)。

## 总结点

1. 六大场景:自调用/non-public/new/捕获/传播/管理器
2. 排查=代理身份+可见性+来源+管理器
3. 事务方法薄,远程调用移出
