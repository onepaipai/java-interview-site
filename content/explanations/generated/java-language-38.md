<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/AutoCloseable.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银连接池沙盘:自研连接池组件未实现 AutoCloseable——关闭靠"记得调 shutdown()"——泄漏。生命周期设计:AutoCloseable(close 幂等)+try-with-resources 集成+关闭顺序(依赖反向)+关闭超时(阻塞的 close 不挂死)。

1. AutoCloseable 契约:close() 幂等(重复调用无害——状态检查)、close 不抛受检异常(或显式声明)、close 后的行为定义(关闭后再用的行为——IllegalStateException 或降级)。
2. 关闭顺序:依赖反向(后创建先关闭——第 12 题try-with-resources 的逆序)——组件间的依赖关系决定关闭序(连接池→其上的服务)。
3. 关闭的完整性:关闭路径全覆盖(正常关闭/异常关闭/JVM 关闭[shutdown hook——仅兜底不替代显式关闭,第 13 题finally 的边界])——第 38 题 spring 生命周期的业务组件版。

## 参考分析

### 第二步扩展① 机制:close 的幂等与超时

- 幂等:close 置 closed 标志(AtomicBoolean)——重复调用直接返回(资源不重复释放)。
- close 后操作:closed 检查→IllegalStateException("组件已关闭")——关闭后的行为显式。
- 超时:close 的内部清理(等待活跃连接归还)带超时——超时后强制关闭(泄漏的连接标记)+日志——阻塞的 close 不挂死调用方(第 23 题 distributed 背压的阻塞边界)。

### 第二步扩展② 反例:生命周期缺陷的三种事故

- 事故一,未 close 泄漏:组件靠调用方记得 shutdown——忘记=泄漏(连接池不释放,连接耗尽)。
- 事故二,close 非幂等:重复 close 抛异常/重复释放(资源二次释放)。
- 事故三,close 死锁:close 等待活跃任务完成,任务又需要该组件的资源——死锁(第 7 题 distributed 反向交易死锁同构)。
- 三条的正解:AutoCloseable+幂等+超时+关闭顺序文档化。

### 第二步扩展③ 取舍:生命周期管理的层级

- 层级一,try-with-resources:短生命周期(请求级资源)——语言级管理。
- 层级二,容器管理(spring @PreDestroy):应用级组件(容器控制生命周期)。
- 层级三,显式关闭(shutdown hook/手动):独立进程/框架外——显式的责任(调用方记得)。
- 判据:生命周期的"归属者"是谁(请求/应用/进程)——归属者决定管理层级。

## 案例

### 第三步发散·验证与推演 验证:生命周期的断言组

- 验证:幂等断言(重复 close 无异常无重复释放)。
- 关闭后行为断言(close 后的操作抛 IllegalStateException——显式)。
- 超时断言(阻塞的 close 在超时后强制关闭)。
- try-with-resources 集成断言(资源自动关闭)——四组固化生命周期。
- 关闭顺序文档化(组件依赖图)进设计文档(第 49 题)。

### 第三步发散·追问扩展 追问链:生命周期三刀

- **Q1：shutdown hook?**
  - 答：Runtime.addShutdownHook(JVM 退出时的清理)——仅兜底(SIGTERM 的最后机会),不可替代显式关闭(第 13 题finally 的边界同构);hook 的时限(JVM 退出不等长 hook)。
- **Q2：Spring 的生命周期?**
  - 答：@PostConstruct/@PreDestroy(容器管理)——与 AutoCloseable 的兼容(DisposableBean/Destroyable)——容器生命周期的业务组件集成(第 33 题)。
- **Q3：关闭的日志?**
  - 答：关闭的事件日志(谁关闭/何时/耗时——第 32 题)——组件的生命周期也进审计。

## 总结点

1. close 幂等,超时不挂死
2. 关闭顺序=依赖反向
3. shutdown hook 仅兜底
