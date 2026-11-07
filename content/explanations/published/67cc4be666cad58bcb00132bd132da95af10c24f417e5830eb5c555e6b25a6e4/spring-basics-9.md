<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 / Spring 6.2 最小实验：客户端通过 JDK 代理调用 outer，目标对象在 outer 内调用 inner。统计拦截次数，再直接从代理调用 inner，区分自调用与外部调用。

1. Spring AOP 的增强在调用经过代理并匹配拦截规则时执行。对象带注解或属于某个类，本身不代表当前调用已经经过代理。
2. 目标对象内部 this.inner() 通常绕过代理，不会重新应用 inner 的独立增强；若 outer 已开启事务，内部方法仍可能处于这个已有事务中。
3. 优先把需要独立增强的边界拆到另一个受管 Bean。排查时核对引用来源、代理类型、可拦截方法及调用路径，不要只检查注解拼写。

## 参考分析

### 调用链：代理拦截发生在目标方法进入之前

调用者持有的是代理引用时，代理先选择匹配的拦截器，再调用目标方法；直接持有目标对象或自行 new 的实例，则不会自然经过这个链。事务、异步、缓存等常见注解都可能依靠代理基础设施实现，必须同时有启用配置、匹配的方法和穿过边界的实际调用。类比打卡闸机：增强逻辑装在大门闸机上，从内部会议室直接串门（自调用）不经过闸机——已有门禁仍有效，但新增强不会触发。

### 自调用：跳过新的拦截，不等于撤销已有上下文

outer 在目标对象内执行 this.inner 时，接收者是目标对象自身，不会再次从代理入口进入。因此 inner 上另设的传播规则、缓存或异步语义可能不起作用。但 outer 已经建立的线程绑定事务并不会因一次普通方法调用消失；说“自调用一定没有事务”会把两个不同问题混为一谈。

### 修复选择：明确边界优于让业务依赖代理细节

将内部操作移到另一个 Bean 后，由外层持有它的受管引用，调用自然跨过新的代理边界。自注入、暴露代理后取 currentProxy 等办法增加循环和运行环境约束，应有明确理由才使用。AspectJ 编织的机制不同，不应把代理模式下的自调用结论无条件套到所有增强技术。

## 案例

### 完整实验：外调一次、自调用不额外拦截

下面主动创建 JDK 代理，不依赖注解扫描，观察代理边界本身。outer 内会调用 inner，但第一次外调只计一次增强；随后直接从代理调用 inner，计数增加到二，verify 预期返回 1:2。它不执行数据库事务，事务结果需要另用真实事务管理器验证。

~~~java
import java.util.concurrent.atomic.AtomicInteger;
import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.ProxyFactory;
public class ProxyBoundaryExample {
  public interface Actions { void outer(); void inner(); }
  public static class Target implements Actions {
    public void outer() { this.inner(); }
    public void inner() {}
  }
  public static String verify() {
    var hits = new AtomicInteger();
    var factory = new ProxyFactory(new Target());
    factory.setInterfaces(Actions.class);
    factory.addAdvice((MethodInterceptor) invocation -> {
      hits.incrementAndGet();
      return invocation.proceed();
    });
    var proxy = (Actions) factory.getProxy(Actions.class.getClassLoader());
    proxy.outer();
    int afterOuter = hits.get();
    proxy.inner();
    return afterOuter + ":" + hits.get();
  }
}
~~~

### 追问：内部 REQUIRES_NEW 为什么仍随外层回滚

设计两个独立写入表，外层事务写订单，再自调用标注 REQUIRES_NEW 的审计方法，最后抛运行时异常；对照把审计方法移到另一个 Bean 的路径。使用容器代理与真实事务管理器读取最终行数：自调用没有应用新的传播规则，审计可能随外层回滚；跨 Bean 时独立事务可先提交。项目已有 DeepAnswerExamplesTest 执行这一窄范围 H2 对照，不代表验证了 MySQL 的锁行为。

## 总结点

1. 闸机在大门，内串不触发
2. 增强依赖实际经过代理
3. 自调用跳过内部独立增强
4. 已有事务不因自调用消失
