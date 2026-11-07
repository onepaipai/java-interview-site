<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)

</details>

## 参考回答

1. 集合快照只解决遍历时的结构变化；同步回调仍会占住通知线程，不能靠 CopyOnWriteArrayList 隔离慢调用。
2. 按监听器或依赖做有界隔离，明确串行顺序、拒绝及丢弃/重试规则；单个异常不能截断整个通知批次。
3. 超时返回不等于回调停止；在途计数和资源许可要等实际退出后归还，必要时调用下游取消接口。

## 案例

1. 场景（教学示例）：监听器 A 挂起，B 是快速更新本地状态的监听器；要求 B 不被 A 拖住。

2. 处理：为慢依赖设置并发许可与有界执行通道，分开 A/B 的资源；提交失败立即反馈，保留每个事件的处理状态。

3. 预期：A 挂起时 B 仍完成；持续输入不会无限创建线程或积压。补测忽略中断的 A，确认超时不会提前放回许可造成并发越界。

## 总结点

1. 快照不隔离回调耗时。
2. 超时返回不等于任务退出。
