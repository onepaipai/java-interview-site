<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银并发访问沙盘:全局唯一 Service 被数百线程并发调用——singleton 不是线程安全保证;无状态才安全,有状态需 prototype/ThreadLocal/锁。

1. 六种作用域:singleton(默认,容器一个实例)/prototype(每次获取新建)/request(HTTP 请求内)/session(会话内)/application(ServletContext)/websocket(会话内);后四种 Web 环境限定,需要代理桥接(@Scope(proxyMode=TARGET_CLASS) 注入到单例)。
2. singleton 不等于线程安全:全局唯一实例=多线程共享同一份字段——有状态(可变成员)就竞态;线程安全的条件=无状态(成员只读或本地变量)或状态本身线程安全(ConcurrentHashMap/Atomic);Spring 官方不保证并发,单例的线程安全是使用者的责任。
3. 有状态怎么办:每次新建(prototype——但注入到单例只注入一次,要 prototype 语义用 ObjectFactory/Provider 每次取)/请求上下文用 ThreadLocal(第 25 题)/共享状态容器化(ConcurrentHashMap)+不可变值对象。

## 参考分析

### 机制:为什么 singleton 是默认

业务组件绝大多数无状态(Service 的字段是注入的其他 Bean,不是运行时数据)——单例省创建成本+全局一致;危险在于把运行时数据放进字段(如实例变量当请求缓存)——污染源=状态跨请求泄漏(用户 A 的数据被 B 读到,第 25 题 ThreadLocal 串号同源)。

### 反例:作用域的两种事故

事故一:Service 字段存中间结果(简单变量当局部缓存)——并发下互相覆盖(复现:两请求交叉,结果错乱);修复=方法内局部变量或去掉状态。事故二:prototype 注入 singleton——只实例化一次,以为是每次新建;修复=ObjectProvider<Service> 每次getObject() 或 @Lookup 方法。

### 边界:Web 作用域的实现

request/session 作用域 Bean 注入单例会报错(作用域对象不存在于启动期)——容器注入代理(继承原类,调用时按作用域从 RequestContextHolder 取真实实例);RequestContextHolder 本质 ThreadLocal(第 25 题)。

## 案例

### 验证:作用域的实测走查

验证:单例断言(两次注入同一实例==);prototype 断言(直接注入=同一实例,ObjectProvider=不同——语义差异立现);并发污染断言(有状态 Service 字段计数,并发下结果错乱;去状态后正确)——三组固化作用域语义,Spring 模块测试可复跑。预期:线程安全责任在状态设计不在 scope 声明。

### 追问链:作用域三刀

一刀:@Scope 与 @RefreshScope(配置热刷新=销毁重建 Bean——Boot Cloud 思路)。二刀:依赖中的 prototype 链=单例持有 prototype 工厂,每次取新实例(状态隔离)。三刀:singleton 的销毁回调(@PreDestroy)只在容器关闭触发——进程被 kill -9 不走(优雅停机信号,第 76 题 JVM 同源)。

## 总结点

1. singleton 默认但非安全保证
2. 无状态才安全,有状态要隔离
3. prototype 注入 singleton 只一次
