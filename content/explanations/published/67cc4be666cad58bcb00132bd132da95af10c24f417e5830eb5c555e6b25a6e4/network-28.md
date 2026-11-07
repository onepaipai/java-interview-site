<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/package-summary.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 事件循环往往承载多连接就绪处理，阻塞一个任务会拖延其他连接。
2. 应把阻塞工作放到有界执行器并传播背压。

## 参考分析

1. 同一事件循环常服务多个连接，单个慢回调会延后其他连接。
2. 把阻塞任务挪走后还需限制新队列和下游并发。

## 案例

1. 场景（教学示例）：某连接处理器直接执行 1 秒 JDBC 查询。

2. 处理：在进入 JDBC 前交给独立有界执行器，结果返回事件循环；沿用截止时间与取消。

3. 验证：其他连接的轻请求不再被该回调拖住；过载时及时拒绝而非无限排队。

## 总结点

1. 事件循环只做短任务。
2. 转异步也要有界。
