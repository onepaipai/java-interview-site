<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)

</details>

## 参考回答

1. 常见作用域有 singleton、prototype，以及 Web 环境的 request、session、application、websocket。
2. singleton 默认复用每个容器中该定义的实例，但不自动线程安全。请求状态优先局部变量，共享可变状态需同步或消除。

## 参考分析

1. prototype 每次向容器获取通常创建新实例，但直接注入单例只在注入时获取一次；其销毁责任也不能照搬单例。
2. request、session 依赖合适 Web 上下文；单例依赖较短作用域时需作用域代理或显式查找，不能把请求对象永存字段。

## 案例

1. 教学场景：单例导出服务把 currentUser 放在字段，两个用户交叉导出导致数据归属错误。

2. 把用户信息改成参数及局部变量，用同步屏障安排两个请求交错；分别测试单例获取和 prototype 两次获取的对象身份。

3. 验证导出不串用户，单例引用复用、原型按次查找不复用；不把对象数量测试当成完整并发安全证明。

## 总结点

1. 作用域控制实例取得与复用。
2. 单例线程安全仍靠状态设计。
