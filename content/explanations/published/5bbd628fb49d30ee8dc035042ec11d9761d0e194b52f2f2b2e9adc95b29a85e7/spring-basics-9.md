<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银订单沙盘:proxy.run() 经代理(拦截 1 次),target.run() 绕代理直调(拦截 0 次)——两次调用后累计 intercepted=1, executed=2(真值示例 ProxyBoundaryExample)。代理边界=拦截的生效范围。

1. 代理的边界:外部调用(经代理)=拦截生效;自调用(this.method)=绕过代理直达目标=拦截失效——代理边界=代理对象与目标对象的分界线(spring-advanced 1 题 的 AOP 深化)。
2. 真值示例(ProxyBoundaryExample,本机编译执行):ProxyFactory 创建代理+计数拦截器——proxy.run() intercepted=1, executed=1;target.run() intercepted=0, executed=2——总计 intercepted=1, executed=2——输出 1:2。
3. 代理的三种边界场景:外部调用(拦截生效)、同类自调用(拦截失效)、内部注入的代理对象调用(拦截生效——注入的是代理)。

## 参考分析

### 机制:ProxyFactory 与拦截计数

ProxyFactory:编程式创建 AOP 代理(非自动代理——手动控制)。计数拦截器:MethodInterceptor 的 invoke 方法计数——外部调用经代理→拦截器计数+目标执行;自调用→目标直接执行(无拦截器)。真值示例:intercepted=1(一次外部调用被拦截)、executed=2(两次方法执行:一次经代理+一次绕代理直调)。

### 反例:代理边界的三种事故

事故一,自调用绕过:同类内调 @Transactional 方法——事务失效(第 1 题 spring-advanced)。事故二,内部 new 绕过:new Target() 直接创建——不经容器与代理(无注入无 AOP)。事故三,final 方法:CGLIB 无法覆写 final 方法——代理对 final 方法失效(拦截不生效)。三条的正解:确保调用经过代理(拆 bean/注入自身代理/AopContext)+避免 final 方法被代理。

### 取舍:JDK 动态代理 vs CGLIB 的代理边界

JDK 动态代理:基于接口(目标必须实现接口)——代理对象实现相同接口(不是目标子类)。CGLIB:基于继承(目标类被继承——final 类/方法不可代理)——代理对象是目标子类。代理边界的差异:JDK 代理的 this=代理对象(实现接口);CGLIB 的 this=代理子类(继承目标)——两者在自调用场景下都绕过拦截(第 1 题 spring-advanced 的机制统一)。

## 案例

### 案例:真值示例(本机编译执行)

以下示例经本地编译执行(Spring Framework 6.2.19),verify() 返回 “拦截次数:目标执行次数”:
~~~java
import org.springframework.aop.framework.*;
import org.aopalliance.intercept.MethodInterceptor;

/** Q9:代理拦截外部调用(intercepted=1),绕代理直调目标仅执行(executed=2)。 */
public class ProxyBoundaryExample {
  static int intercepted = 0;
  static int executed = 0;
  static class Target {
    public void run() { executed++; }
  }
  public static String verify() {
    Target target = new Target();
    ProxyFactory pf = new ProxyFactory(target);
    pf.addAdvice((MethodInterceptor) inv -> { intercepted++; return inv.proceed(); });
    Target proxy = (Target) pf.getProxy();
    proxy.run();          // 经代理:拦截 1 次,执行 1 次
    target.run();         // 绕代理直调:拦截 0 次,执行 2 次
    return intercepted + ":" + executed;
  }
  public static void main(String[] a) { System.out.println(verify()); }
}
~~~
执行结果 1:2:这是两次调用后的累计值——proxy.run() 拦截 1 次+执行 1 次,target.run() 拦截 0 次+执行 1 次(累计 executed=2);示例中"绕代理"是外部直调 target,this 自调用是它的业务形态(见 spring-advanced 1 题)——代理边界=拦截的生效范围。验证:本机编译执行输出与断言一致,后端真值测试持续执行本块。

### 验证:代理边界的断言组

验证:真值断言(ProxyBoundaryExample 的 1:2——后端真值测试持续执行);自调用断言(同类调 @Transactional 方法——事务失效复现,spring-advanced 1 题);注入代理断言(注入的是代理对象——getClass 含 CGLIB/$Proxy)——三组固化代理边界;AopContext.currentProxy 的暴露代理用例(exposeProxy=true)补充。

### 追问链:代理边界三刀

一刀:"代理对象的字段?"——CGLIB 代理的字段是空壳(字段在 target——代理的字段全 null,第 19 题spring-advanced 实测)——不要在代理上读字段(经 target 读)。二刀:"多重代理?"——多个 Advisor 叠加(拦截器链——顺序执行)——链的顺序影响结果(第 24 题 distributed 的链式同构)。三刀:"编程式 vs 自动代理?"——ProxyFactory(手动创建——精准控制)vs @EnableAspectJAutoProxy(自动——注解驱动)——编程式适合教学/演示,自动适合生产。

## 总结点

1. 外部拦截生效,自调用绕过
2. 代理边界=代理与目标的分界
3. 真值示例 1:2 持续验证
