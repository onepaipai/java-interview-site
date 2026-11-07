<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/package-summary.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 区别在于等待方式与执行模型，选择需考虑连接数、单请求工作和库生态。
2. 非阻塞网络不等于业务代码可以任意阻塞。

## 参考分析

1. BIO 简单但阻塞占线程，NIO 适合多连接事件处理。
2. 异步接口不保证底层依赖非阻塞，选型按连接数与任务形态。

## 案例

1. 场景（教学示例）：大量长连接大部分空闲，少量消息需慢数据库查询。

2. 处理：网络等待采用事件驱动，阻塞工作用受控执行器，压测连接规模及资源峰值。

3. 验证：空闲连接不要求等量平台线程；数据库并发仍有限且故障可隔离。

## 总结点

1. I/O 模型看负载。
2. 异步接口仍要管阻塞。
