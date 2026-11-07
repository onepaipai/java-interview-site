<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/features/integrations/concurrency.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 / Spring Security 6.5 教学实验：同一个工作线程先执行 Alice 的任务，再执行不带身份的原始任务，验证传播和清理，不使用时间等待猜测线程复用。

1. 默认安全上下文通常保存在 ThreadLocal，新任务不会自动取得提交者身份；InheritableThreadLocal 也不适合直接解决预先创建的线程池复用问题。
2. 使用受控的安全上下文包装器或执行器，在明确时点捕获所需上下文，执行前设置并在 finally 中清理或恢复原上下文；不能无意固定为一个提交者身份。
3. 上下文对象和 Authentication 可能共享引用，不要当作天然不可变快照。任务持久化后应保存稳定身份标识并按需要重新授权，不能让旧权限无限生效。

## 参考分析

### 传播时点：提交者、执行器构造者可能不是同一个人

包装器可以接收显式 SecurityContext，也可在相应构造或提交时点取得当前上下文。复用一个固定上下文执行器可能让所有任务以同一个身份运行，除非这本来就是明确的系统任务设计。要在任务边界传最少必要信息，分别定义用户身份、租户、追踪号及其可信来源，不用复制所有线程本地变量来解决。类比工牌借用：提交任务时拍照留存工牌信息（捕获快照），归还前必须注销（线程复用清理）——工牌过期不能当永久授权。

### 线程复用：成功和异常都必须收尾

工作线程执行完 Alice 的任务后通常还会处理 Bob 或匿名任务，如果身份未清理就可能越权。Spring 的委托包装器围绕执行安排上下文设置和收尾；自定义包装也要覆盖异常路径与原上下文恢复。不要依赖任务自然结束就销毁线程，因为池中的线程往往长期存活。

### 权限时效：传入身份不是永久授权凭证

捕获上下文通常不是深拷贝，任务运行期间也不应随意修改与其他请求共享的 Authentication。排队很久或持久化任务需要定义权限变更后的执行策略，必要时重新读取可信权限版本。传播安全上下文不传播数据库事务，也不能替代任务访问具体资源时的对象级授权。

## 案例

### 完整程序：同一工作线程的身份先有后清

下面显式创建 Alice 的上下文并只包装一个任务，使用单线程池和 Future.get 保证执行先后。后续原始任务不带上下文，预期返回 alice:anonymous。该程序验证包装器清理，不证明跨节点权限撤销或数据库事务传播。

~~~java
import java.util.List;
import java.util.concurrent.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.concurrent.DelegatingSecurityContextCallable;
import org.springframework.security.core.context.SecurityContextHolder;
public class SecurityContextPoolExample {
  static String identity() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication == null ? "anonymous" : authentication.getName();
  }
  public static String verify() throws Exception {
    var executor = Executors.newSingleThreadExecutor();
    try {
      executor.submit(SecurityContextHolder::clearContext).get();
      var context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(new UsernamePasswordAuthenticationToken("alice", "unused", List.of()));
      var wrapped = new DelegatingSecurityContextCallable<String>(SecurityContextPoolExample::identity, context);
      String first = executor.submit(wrapped).get();
      String next = executor.submit(SecurityContextPoolExample::identity).get();
      return first + ":" + next;
    } finally {
      executor.shutdownNow();
      SecurityContextHolder.clearContext();
    }
  }
}
~~~

### 异常追问：任务中途失败还会留下身份吗

补充一个包装后主动抛错的任务，捕获 Future 中的异常，再在同一个工作线程运行原始任务查询身份，预期同样没有 Alice 残留。生产任务还要覆盖 Bob 紧随 Alice、执行器拒绝及权限在排队期间被撤销的情况。上面的成功路径程序只是窄范围执行证据，不能据此宣布所有异常和授权场景均已验证。

## 总结点

1. 借工牌拍照留存，归还前注销
2. 捕获时点和上下文所有权明确
3. 线程复用前必须清理身份
4. 传播身份不等于永久授权
