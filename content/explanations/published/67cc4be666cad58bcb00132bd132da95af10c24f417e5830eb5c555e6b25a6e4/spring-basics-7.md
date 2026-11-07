<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-extension.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 / Spring 6.2 实验：容器中有一个配置了 message 属性的 Bean。先在 Bean 定义阶段改属性，再在实例初始化后加包装效果，观察两个扩展点操作的对象和执行阶段。

1. BeanFactoryPostProcessor 操作容器中的 BeanDefinition 等配置元数据，发生在常规 Bean 实例化之前；不应为修改定义而提前 getBean 创建业务对象。
2. BeanPostProcessor 参与 Bean 实例的初始化前后处理，可以返回原实例或包装实例；自动代理创建器就是基于这类扩展机制工作的。
3. 两者不能互换。还要注意 BeanDefinitionRegistryPostProcessor、实例化感知处理器等更细的扩展接口，以及后处理器自身过早初始化的限制。

## 参考分析

### 定义阶段：修改创建配方而不是已经存在的实例

BeanFactoryPostProcessor 看到的是容器配置元数据，例如属性值与作用域。修改后由容器按新定义创建普通 Bean。为了读取某个业务对象而在该回调中调用 getBean，可能造成过早实例化，使它错过后续完整后处理过程。需要注册新定义时，应进一步区分 BeanDefinitionRegistryPostProcessor 的职责。类比食谱审批与成品检验是两道关：BFPP 改的是怎么做（配方），BPP 检查甚至替换做出来的菜（实例）。

### 实例阶段：初始化回调与可替换的返回值

BeanPostProcessor 的常规两个回调围绕初始化方法执行；返回值会进入后续处理链，因此包装器可以改变外部最终看到的对象。依赖注入、早期代理等还有相关子接口参与，不宜把所有过程都简化成只执行这两个回调。用两个接口名背顺序，还必须解释它们分别能改变什么。

### 扩展边界：基础设施自己也有创建限制

后处理器需要先被识别与创建，直接依赖它的对象可能早于普通自动代理创建阶段被实例化。@Bean 返回后处理器时应采用适当的静态工厂方法并声明清晰返回类型，减少配置类及其依赖被过早创建的问题。多个处理器还有排序规则，不能依赖源文件里方法的书写先后。

## 案例

### 完整实验：同一个值经历定义修改和实例处理

这个最小程序使用静态工厂注册处理器，避免为建立处理器而先创建配置类依赖。verify 预期返回 definition:instance，分别对应定义阶段写入属性和初始化后修改实例。本例为观察阶段而直接改实例，并没有实现生产代理器。

~~~java
import org.springframework.beans.factory.config.*;
import org.springframework.context.annotation.*;
public class BeanPhasesExample {
  public static class Message {
    private String text;
    public void setText(String text) { this.text = text; }
  }
  @Configuration(proxyBeanMethods = false)
  static class Config {
    @Bean static BeanFactoryPostProcessor definitions() {
      return factory -> factory.getBeanDefinition("message")
          .getPropertyValues().add("text", "definition");
    }
    @Bean static BeanPostProcessor instances() {
      return new BeanPostProcessor() {
        public Object postProcessAfterInitialization(Object bean, String name) {
          if (bean instanceof Message value) value.text += ":instance";
          return bean;
        }
      };
    }
    @Bean Message message() { return new Message(); }
  }
  public static String verify() {
    try (var context = new AnnotationConfigApplicationContext(Config.class)) {
      return context.getBean(Message.class).text;
    }
  }
}
~~~

### 追问：为什么不能用提前 getBean 验证新定义

若在 definitions 回调中主动取得 message，普通实例可能在 BeanPostProcessor 注册完整之前就已创建，后面的包装或代理不再按原设想发生。验收时应在 refresh 完成后查询最终实例，并记录定义属性与最终对象的差别。上面的运行结果验证的是两个扩展阶段，不证明任意后处理器组合都能无条件保持相同顺序。

## 总结点

1. 后处理器改配方，实例检验可替换
2. 工厂后处理器改定义
3. 实例后处理器可返回包装对象
4. 避免提前创建业务 Bean
