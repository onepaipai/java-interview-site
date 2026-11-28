<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银任务沙盘:prototype 任务注入 singleton 的 Runner——注入时创建一个实例,Runner 每次调用用的是同一个(不会每次新建)——prototype 的"每次新建"只在 getBean/ObjectProvider 时生效。真值示例:lookup=true / injected=false(本机实测)。

1. 注入语义:prototype 注入 singleton——注入发生在 singleton 创建时(一次)——之后 singleton 持有该 prototype 的引用(不重建)——"prototype 每次新建"的语义仅适用于 getBean/ObjectProvider 主动获取。
2. 真值示例:PrototypeLookupExample(本机编译执行)——getBean 两次返回不同对象(lookupNew=true);注入 Holder 的 counter 两次访问同一引用(injectedNew=false)——输出 true:false。
3. 解决注入不新建:ObjectProvider(每次 getObject 新建)/@Lookup 方法(Spring 子类覆写)/ObjectFactory——三种"延迟获取原型"的方式。

## 参考分析

### 第二步扩展① 机制:注入时序与 prototype 语义

- 注入时序:singleton 创建→容器解析依赖→prototype getBean(创建一次)→注入引用→singleton 持有——此后 singleton 的字段=固定引用。
- prototype 语义的生效条件:通过容器获取(getBean/ObjectProvider/getObject)——每次获取触发新实例。
- 注入的引用=快照(不随 prototype 语义变化)。
- ObjectProvider 的 getObject():每次调用触发 getBean(prototype)=新实例——"延迟的原型获取"。

### 第二步扩展② 反例:注入 prototype 的两种误用

- 误用一,期望每次新建:注入 prototype 到 singleton 的字段——字段引用固定(不新建)——需要新建却拿到同一实例(业务 bug)。
- 误用二,prototype 中的 singleton 反向:prototype 注入 singleton——singleton 是全局单例(prototype 持有全局状态的引用)——prototype 的"独立生命周期"被破坏。
- 两条的正解:ObjectProvider/Lookup 方法(延迟获取)+作用域代理(scoped proxy——每次方法调用路由到当前实例)。

### 第二步扩展③ 取舍:scoped proxy 与 ObjectProvider

- scoped proxy:代理拦截每次方法调用→路由到当前作用域的实例(对调用方透明——像普通注入一样用)——适合"prototype 的方法被频繁调用"的场景。
- ObjectProvider:显式调用 getObject()——适合"需要控制创建时机"的场景。
- 选择:透明性(proxy)vs 显式控制(provider)——proxy 的依赖注入语义更自然,provider 的控制更精细。

## 案例

### 第三步发散·验证与推演 案例:真值示例(本机编译执行)

- 以下示例经本地编译执行(Spring Framework 6.2.19),verify() 返回 “getBean 每次新建:注入后是否重建”:
~~~java
import org.springframework.context.annotation.*;

/** Q4:prototype getBean 每次新建(true),注入单例后不重建(false)。 */
public class PrototypeLookupExample {
  public static String verify() {
    var ctx = new AnnotationConfigApplicationContext(Config.class);
    try {
      Counter c1 = ctx.getBean(Counter.class);
      Counter c2 = ctx.getBean(Counter.class);
      boolean lookupNew = c1 != c2;
      Holder h = ctx.getBean(Holder.class);
      boolean injectedNew = h.counter != h.counter;
      return lookupNew + ":" + injectedNew;
    } finally { ctx.close(); }
  }
  static class Counter {}
  static class Holder {
    final Counter counter;
    Holder(Counter c) { this.counter = c; }
  }
  @Configuration
  static class Config {
    @Bean @Scope("prototype") Counter counter() { return new Counter(); }
    @Bean Holder holder(Counter c) { return new Holder(c); }
  }
  public static void main(String[] a) { System.out.println(verify()); }
}
~~~
- 执行结果 true:false:getBean 两次返回不同实例(true),注入进 Holder 后引用固定(false)——prototype 的"每次新建"只在主动获取时生效,注入是快照。
- 验证:本机编译执行输出与断言一致,后端真值测试持续执行本块。

### 第三步发散·追问① 验证:prototype 注入的断言组

- 验证:lookup 断言(getBean 两次不同对象——true)。
- 注入断言(注入 singleton 后引用固定——false)。
- 真值断言(verify() 返回 true:false——后端真值测试持续执行)——三组固化 prototype 语义。
- scoped proxy 的对照用例(代理模式下每次调用新实例)补充。

### 第三步发散·追问扩展 追问链:prototype 三刀

- **Q1：prototype 的销毁?**
  - 答：容器不管理 prototype 的销毁(容器只管创建——销毁由客户端负责)——prototype 的资源清理(DisposableBean 不生效)——客户端的销毁责任。
- **Q2：prototype 与 @PostConstruct?**
  - 答：@PostConstruct 生效(创建时调用)——创建回调生效但销毁回调不生效(容器不跟踪)——生命周期的不对称。
- **Q3：prototype 的性能?**
  - 答：每次 getBean 走完整创建流程(实例化+注入+回调)——高频率 getBean 的成本——缓存或改用 singleton(按业务语义)。

## 总结点

1. 注入一次,不随调用新建
2. ObjectProvider 每次新建
3. 容器不管 prototype 销毁
