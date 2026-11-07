<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 对象图、序列化缓冲与网络积压可能同时保留数据，形成多份副本。
2. 限制返回量、采用分页或流式输出，并控制慢客户端。

## 参考分析

1. 报文大小不等于解析后的对象大小。
2. 一次完整反序列化叠加并发可能放大堆峰值。

## 案例

1. 场景（教学示例）：十个请求同时解析大 JSON 数组。
2. 处理：设置请求体上限和并发预算，采用流式解析及批次写出，记录分配率。

3. 验证：峰值随批次而非整份文档增长；超限在分配大对象前拒绝。

## 总结点

1. 报文会膨胀。
2. 峰值等于单次乘并发。
