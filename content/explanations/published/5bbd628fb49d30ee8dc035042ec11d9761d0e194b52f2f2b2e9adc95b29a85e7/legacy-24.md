<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Executors.html)

</details>

## 参考回答

1. 风险取决于具体工厂：fixed 和 single 常用无界队列，cached 常允许极大线程数，突发阻塞负载可耗尽不同资源。
2. 不能一概断言 Executors 所有方法都不安全；需要根据负载显式评审线程、队列、超时、拒绝及生命周期。
3. 自建执行器也可能错误，例如有界队列配静默丢弃让 Future 不完成；容量配置与完成协议应一起验证。

## 案例

1. 场景（教学示例）：一万条慢 RPC 突发，分别交给固定线程池和缓存线程池。

2. 固定池检查任务积压与年龄，缓存池检查线程及本地内存；改用按下游容量定界、明确拒绝的执行器。

3. 预期：过载时资源保持边界，未接收任务有终态；这里是风险场景，不实际创建一万线程或宣称某个工厂必然在此规模崩溃。

## 总结点

1. 不同工厂隐藏不同容量风险。
2. 显式配置也必须验证失败路径。
