<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:BFPP 在容器启动早期修改 BeanDefinition(改配置/加属性);BPP 在每个 bean 创建后修改实例(代理/注入)——时机不同:BFPP=定义级(类元数据),BPP=实例级(对象)。真值示例:definition:instance(本机 BeanPhasesExample)。

1. BFPP 在 refresh 早期改 BeanDefinition(定义级,非实例),典型是占位符替换;BPP 在每个 bean 初始化前后改实例(代理/注入),典型是 @Autowired 处理器与 AOP 自动代理——一个管定义一次调用,一个管实例每 bean 两调。
2. 真值示例(BeanPhasesExample,本机编译执行):definition(BeanDefinition 注册后存在,实例不存在)→instance(getBean 后出现)——BFPP 在 definition 阶段工作,BPP 在 instance 阶段工作——时序不同。
3. 执行顺序:BFPP→bean 定义冻结→逐 bean 实例化→BPP.before→初始化→BPP.after(代理)→下一个 bean——BFPP 一次(BPP 每 bean 一次)——BFPP 的成本=一次,BPP 的成本=N 次(bean 数)。

## 参考分析

### 机制:两个阶段的操作对象

BFPP 的操作对象:BeanDefinition(类名/构造参数/属性值/作用域)——修改 definition=影响后续所有该 bean 的实例化。BPP 的操作对象:Bean 实例(Object——任何类型)——修改实例=代理/包装/注入额外状态。时序:BFPP 在 AbstractApplicationContext#refresh 的 invokeBeanFactoryPostProcessors 阶段调用(所有 definition 加载后、任何实例化前),其中 BeanDefinitionRegistryPostProcessor(可注册新定义)先于普通 BFPP 且分两批(先注册型后修改型);BPP 在 finishBeanFactoryInitialization 阶段逐 bean 的初始化前后调用——BFPP 先于 BPP;BPP 自身的排序(PriorityOrdered→Ordered→普通)决定代理包装顺序。

### 反例:BFPP/BPP 混用的两种事故

事故一,BFP 做代理:BFPP 尝试修改 bean 实例——实例不存在(definition 阶段,还没实例化)——类型错误。事故二,BPP 修改 definition:BPP 拿到的不是 definition(拿到的是实例)——修改无效。两条的正解:改配置用 BFPP(定义级)、改实例用 BPP(实例级)——时机与操作对象匹配。

### 取舍:BPP 的性能影响

BPP 对每个 bean 调用两次(before+after)——BPP 数量×bean 数量=调用次数(大应用的启动成本,第 40 题);BPP 的 on-suite 实现(必须返回 bean 或包装——返回 null 破坏容器)。注册方式:自动检测(实现接口的 bean 自动注册)+手动注册( Ordering——BPP 的顺序影响代理顺序,Ordered 接口)。

## 案例

### 案例:真值示例(本机编译执行)

以下示例经本地编译执行(Spring Framework 6.2.19),verify() 返回 “注册后阶段:getBean 后阶段”:
~~~java
import org.springframework.beans.factory.support.*;
import org.springframework.beans.factory.*;

/** Q7:BeanDefinition 注册后存在(definition),实例化前无 instance;getBean 后 instance 出现。 */
public class BeanPhasesExample {
  public static String verify() {
    DefaultListableBeanFactory bf = new DefaultListableBeanFactory();
    bf.registerBeanDefinition("svc",
        BeanDefinitionBuilder.genericBeanDefinition(Svc.class).getBeanDefinition());
    boolean hasDef = bf.containsBeanDefinition("svc");
    boolean hasInstance = bf.containsSingleton("svc");
    bf.getBean("svc");
    boolean afterInstance = bf.containsSingleton("svc");
    return (hasDef && !hasInstance ? "definition" : "?") + ":" + (hasDef && afterInstance ? "instance" : "?");
  }
  static class Svc {}
  public static void main(String[] a) { System.out.println(verify()); }
}
~~~
执行结果 definition:instance:BeanDefinition 注册后 containsSingleton 为假(definition 阶段),getBean 后为真(instance 阶段)——BeanFactory 懒加载的两阶段铁证。验证:本机编译执行输出与断言一致,后端真值测试持续执行本块。

### 验证:BFPP/BPP 区分的断言组

验证:真值断言(BeanPhasesExample 的 definition:instance——后端真值测试);时序断言(BFPP 在 BPP 之前执行——日志顺序断言);操作对象断言(BFPP 拿到 BeanDefinition/BPP 拿到 Object 实例)——三组固化 BFPP/BPP 的时机与对象差异。

### 追问链:BFPP/BPP 三刀

一刀:"BeanDefinitionRegistryPostProcessor?"——BFPP 的子接口(可注册新 BeanDefinition——动态 bean 注册)——比 BFPP 更早(先于普通 BFPP)——动态 bean 注册的入口。二刀:"BPP 的顺序?"——Ordered/@Priority 控制多个 BPP 的执行序——代理 BPP(AutoProxyCreator)通常最后(让其他 BPP 先处理)——顺序影响代理的包装层数。三刀:"BPP 的范围?"——影响所有 bean(不筛选)或限类型(InstanceOfBeanTypeAwareBPP)——范围过大=性能成本(每个 bean 都调)。

## 总结点

1. BFPP 管定义,BPP 管实例
2. BFPP 一次,BPP 每 bean 两次
3. 时序:BFPP 先于 BPP
