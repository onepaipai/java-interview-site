<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/autowired.html)

</details>

## 参考回答

1. 用稳定业务键注册策略，路由器只查找并调度；启动时校验键唯一和必需策略，未知键有明确失败或默认规则。
2. 实现选择与交易编排分开，注册表注入受管策略引用以保留代理；不要用客户端传入的类名反射任意实现。

## 参考分析

1. Map<String, Strategy> 的 Bean 名称不一定就是业务键，可显式提供 key 并构建经过校验的不可变注册表。
2. 策略配置更新还要处理版本与在途请求，一次调用不应中途切换实现。

## 案例

1. 教学场景：多个支付渠道通过 if 判断，新增渠道时误覆盖已有默认分支。

2. 按渠道业务键构建注册表，添加重复键、未知键、缺失必需项和合法路由的测试。

3. 验证冲突在启动期暴露，合法请求调用正确受管实现，未知策略不静默走错渠道。

## 总结点

1. 业务键注册并校验唯一。
2. 路由器不混入渠道业务。
