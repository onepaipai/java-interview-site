<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/dependencies/factory-collaborators.html)

</details>

## 参考回答

1. 先画实例与业务依赖图，寻找职责互渗及错误层次，拆出编排、查询或共享策略，让关键依赖方向单向。
2. @Lazy、Provider 和允许循环配置可能推迟解析，不会自动修复业务耦合；构造器环也不能靠早期实例自然解决。

## 参考分析

1. 只改注入方式可能留下初始化期调用与代理不一致风险；不应把容器缓存机制当业务设计目标。
2. 拆分需保留事务、授权和失败恢复边界，不能为消环把同一不变式拆成不受控远程流程。

## 案例

1. 教学场景：订单依赖库存扣减，库存又调用订单改状态，两个构造器互相请求。

2. 提取结算编排者，库存和订单各自提供清晰操作，再测试创建图与失败路径。

3. 验证启动无循环，库存不足和订单写失败都守住一致性；使用 Lazy 的临时方案需记录调用期风险和退出路径。

## 总结点

1. 消环先调整职责与方向。
2. 启动通过后仍测业务不变式。
