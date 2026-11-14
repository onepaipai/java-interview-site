<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银异步导出沙盘:主线程已认证(alice),线程池任务里取 Authentication 得到 anonymous——安全上下文同样活在 ThreadLocal,不跨线程。用可执行示例说明传播与清空的正确姿势。

1. SecurityContextHolder 默认 MODE_THREADLOCAL:换线程即丢。实测(可执行示例):装饰传播的池线程看到 alice,裸池线程看到 anonymous。
2. 传播工具:DelegatingSecurityContextCallable/Executor(包装任务时捕获当前上下文);@Async 场景配 AsyncConfigurer 的装饰器。
3. 两个坑:传播的上下文在任务里越权放大(任务拿了 alice 权限做非授权动作);池线程残留上下文污染下一任务(未 clear)。

## 参考分析

### 机制:ThreadLocal 语义与显式传播

安全上下文与事务上下文(第 8 题)同源:ThreadLocal 绑定,线程池复用线程即丢失。显式传播的两步:提交任务时捕获当前 SecurityContext(创建时刻快照),任务执行前 set、finally 清理——DelegatingSecurityContextCallable 封装了这套动作。传播是"显式授权":每个传播点都是一次"该任务需要什么身份"的决策,而不是无脑全量携带。

### 边界:传播的安全边界

上下文是提交时刻的快照:任务执行期间用户权限被撤销,不会反映到已传播的上下文——长任务要重新校验授权而不是依赖携带的身份;跨服务传播(消息队列)不走 ThreadLocal,需要显式把身份放进消息头并在对端重建——与链路上下文(W3C traceparent)的传播协议同构。

### 取舍:每个传播点都要回答「该带谁的身份」

每个传播点都要回答「该带谁的身份」——用户上下文传播给业务任务(按用户判权)是显式授权;系统任务应使用系统身份,传播用户身份反而造成越权放大。装饰器之外自写传播必须 finally 恢复原值;线程池场景优先 Delegating 系包装,把传播与清理收口在基础设施层。

## 案例

### 实证:可执行示例的传播对照

以下示例经本地编译执行(Spring Security 6.5.11),verify() 返回"传播线程的身份:裸线程的身份":
~~~java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.concurrent.DelegatingSecurityContextCallable;
import org.springframework.security.authentication.TestingAuthenticationToken;

/** Q19:线程池默认不继承安全上下文,显式装饰器传播后可见 alice,裸线程池看到 anonymous。 */
public class SecurityContextPoolExample {

  public static String verify() throws Exception {
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(new TestingAuthenticationToken("alice", "n/a"));
    SecurityContextHolder.setContext(context);
    ExecutorService pool = Executors.newSingleThreadExecutor();
    try {
      var decorated = new DelegatingSecurityContextCallable<>(
          (java.util.concurrent.Callable<String>) () ->
              SecurityContextHolder.getContext().getAuthentication().getName(), context);
      String propagated = pool.submit(decorated).get();
      SecurityContextHolder.clearContext();
      String bare = pool.submit(() -> {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "anonymous" : auth.getName();
      }).get();
      return propagated + ":" + bare;
    } finally {
      pool.shutdown();
      SecurityContextHolder.clearContext();
    }
  }
}
~~~
执行结果 alice:anonymous:装饰的任务拿到 alice,裸任务拿到 anonymous(未认证兜底)。验证:本机编译执行;后端真值测试持续执行本块。

### 验证:按本示例编译执行,断言 verify() 返回 alice:

验证:按本示例编译执行,断言 verify() 返回 alice:anonymous(装饰传播与裸池对照);再把任务里的上下文残留场景(未 clear)加进测试,断言下一任务身份被污染——传播与清理都要有断言,后端真值测试持续执行本块。

### 追问链:传播三刀

一刀:"@Async 怎么传播?"——配置 AsyncConfigurer 的 TaskDecorator(或 DelegatingSecurityContextAsyncTaskExecutor),异步方法即自动携带提交者上下文;装饰器里同时传播 MDC(链路日志,第 40 题)。二刀:"传播后的权限检查以谁为准?"——以传播的身份为准:任务里调用受保护方法按 alice 判权——若任务本该是系统身份,传播用户身份反而错;每个传播点明确"该带谁的身份"。三刀:"上下文残留怎么防?"——Delegating 包装器 finally 里恢复原值;自写传播务必 finally clear;池线程残留 alice 身份会被下一个任务继承——越权放大器。

## 总结点

1. 上下文是快照,传播是显式授权
2. 传播必配 finally 清理
3. 裸池就是 anonymous,别猜
