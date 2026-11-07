<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html)

</details>

## 参考回答

1. IoC 是把对象创建和协作控制移交给容器等外部机制，DI 是其中通过构造器、工厂参数或属性提供依赖的实现方式。
2. 好处是分离业务与装配、方便替换实现和测试、集中管理生命周期；容器不会自动消除业务耦合或保证线程安全。

## 参考分析

1. 用接口声明业务需要什么，由装配决定如何提供，避免业务到处读取配置并创建具体类。
2. 依赖应仍然可理解，滥用容器查找或循环引用会把耦合藏到运行期；必需依赖优先显式构造器传入。

## 案例

1. 教学场景：通知服务自行创建短信客户端，单测必须配置真实账号。

2. 抽出通知端口并由构造器接收，生产装配短信适配器，测试装配记录发送内容的替身。

3. 验证普通业务测试不访问外网，适配器单独验证协议；关闭上下文时容器管理的客户端按约定释放。

## 总结点

1. IoC 表达控制权转移。
2. DI 让装配与业务分离。
