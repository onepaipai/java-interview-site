<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/web/graceful-shutdown.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/integration/scheduling.html)

</details>

## 参考回答

1. 停止接收新流量、限时完成在途请求，只覆盖 Web 部分；后台调度、消息消费和异步任务也可能继续产生工作或占用资源。
2. 需要协调就绪状态、入口撤流、停止领取、排空和资源关闭，并让未完成工作可恢复；强制终止和超时必须有预案。

## 参考分析

1. Boot 3.5 嵌入服务器默认支持优雅停机，仍需核对容器终止预算、代理传播延迟和生命周期阶段超时。
2. 在业务线程尚未退出前关闭数据库或执行器，会制造新失败；内存队列任务也不因停机等待就具有持久性。

## 案例

1. 教学场景：滚动发布时旧实例仍领取任务，Web 已停但异步通知丢失。

2. 先停止新工作并撤就绪，设置有界等待；任务保存可恢复状态，在途操作按幂等协议完成或交接。

3. 验证停机期间无新领取，正常任务可完成，超预算任务重启后可恢复；分别测试正常终止信号与强制退出。

## 总结点

1. 入口和后台共同停止新工作。
2. 超时后的任务必须可恢复。
