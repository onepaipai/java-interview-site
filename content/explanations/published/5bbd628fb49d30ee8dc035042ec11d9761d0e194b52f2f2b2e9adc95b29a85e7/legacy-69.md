<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. 线程数结合计算、等待比例和下游容量估算，再压测校准。
2. 队列有界且按等待预算设计，拒绝策略体现调用方承受能力。
3. 动态调整先看哪个参数当前生效，监控年龄、拒绝、吞吐和完成时延。

## 参考分析

1. 增大最大线程数不一定绕过排队。
2. 父任务等待同池子任务会耗尽执行位。
3. 只看队列长度难判断剩余等待。

## 案例

1. 场景（教学示例）：营销下游变慢后拖住交易请求。
2. 处理：拆分有界资源池，为各下游设独立并发与截止时间，记录队列最老年龄。

3. 验证：营销超时不耗尽交易池；恢复期平滑放量而非一次放开。

## 总结点

1. 资源按故障域隔离。
2. 排队年龄比长度直观。
