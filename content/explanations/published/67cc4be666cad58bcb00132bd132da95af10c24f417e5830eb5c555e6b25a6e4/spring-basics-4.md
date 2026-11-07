<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 / Spring 6.2 最小实验：单例 ExportService 持有 prototype 的 Buffer。比较直接构造器注入与 ObjectProvider 按次查找，使用对象身份验证，不依赖日志时间推断。

1. 不会。直接把 prototype 注入单例时，容器在创建单例、解析该依赖时取得一个实例，单例之后持有的仍是这个引用。
2. 需要按次创建时，可注入 ObjectProvider 并在每次业务操作中调用 getObject，或使用明确配置的作用域代理、方法注入；不能仅靠 prototype 注解改变已有字段。
3. prototype 的初始化由容器处理，销毁回调不会像单例一样自动完整管理；持有文件、连接等资源时必须明确释放责任。

## 参考分析

### 两个时点：依赖解析与业务方法调用

作用域控制向容器请求某个 Bean 时如何取得实例，不会自动重写普通 Java 字段的读取。单例被创建时，直接注入只解析一次原型依赖；后续调用单例方法不一定再次访问 BeanFactory。因此每次 HTTP 请求进入同一服务，也不意味着它持有的原型字段会随请求变化。类比公司配车：入职时配的那辆（依赖解析一次）不会因为每天出勤自动换新车——按次用车就得每次去车队领（ObjectProvider）。

### 按次获取：把创建边界放在业务操作上

ObjectProvider<Buffer> 本身是一个查找入口；在 export 方法内部调用一次 getObject，并把结果保存在该次操作的局部变量中，才能让一次导出使用独立缓冲区。不要在单例构造器中提前 getObject 后再存成字段，那仍然只取得一次。代理方案还应区分代理对象身份与其背后目标对象身份。

### 资源边界：新实例仍需要被关闭

Spring 不负责跟踪并自动执行所有 prototype 实例的销毁回调，使用方应为它们安排关闭流程。短生命期对象也不必全部注册成 Bean：如果它不需要容器能力，普通工厂和 try-with-resources 往往更明确。按次创建解决实例复用问题，不自动解决调用链中的共享可变状态。

## 案例

### 完整实验：同一字段与两次查找的身份

下面的 verify 在项目 Java 17 / Spring 6.2 测试类路径下运行。直接注入对象的两次访问结果相同，两次 provider 查找不同，预期返回 true:false。示例不配置作用域代理，因此没有把代理身份误当作目标身份。

~~~java
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.*;
public class PrototypeLookupExample {
  static class Buffer {}
  static class ExportService {
    final Buffer injected;
    final ObjectProvider<Buffer> provider;
    ExportService(Buffer injected, ObjectProvider<Buffer> provider) {
      this.injected = injected;
      this.provider = provider;
    }
    Buffer current() { return injected; }
  }
  @Configuration(proxyBeanMethods = false)
  static class Config {
    @Bean @Scope("prototype") Buffer buffer() { return new Buffer(); }
    @Bean ExportService service(Buffer buffer, ObjectProvider<Buffer> provider) {
      return new ExportService(buffer, provider);
    }
  }
  public static String verify() {
    try (var context = new AnnotationConfigApplicationContext(Config.class)) {
      var service = context.getBean(ExportService.class);
      return (service.current() == service.current()) + ":"
          + (service.provider.getObject() == service.provider.getObject());
    }
  }
}
~~~

### 故障追问：原型缓冲区为何仍串数据

若 export 构造时就获取原型并保存到 injected 字段，两个并发导出仍会共享这一个缓冲区。修复后让每次导出取一个局部实例，并用同步屏障组织两个请求交叉写入，验证结果互不混入、异常时资源也被释放。上面的身份实验只证明创建与复用规则，不替代这个并发和资源关闭测试。

## 总结点

1. 入职配车不换新，按次用车去车队
2. 原型控制查找，不重写字段
3. 每次操作在边界显式获取
4. 原型资源由使用方安排释放
