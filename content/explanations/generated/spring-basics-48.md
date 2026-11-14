<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银停机沙盘:K8s 发 SIGTERM 应用开始关闭——但入站请求还在到 HTTP 连接未关闭加后台任务还在跑 Scheduled 异步线程——优雅停机等于入口停止加在途完成加后台安全停止。

1. 停机的三个阶段入口停止停止接收新请求网关摘流量 Server 关闭 connector,在途完成已接收的请求处理完成等待超时,后台停止 Scheduled 停止调度异步线程等待完成 MQ 消费者停止——三阶段的顺序与超时。
2. Spring Boot 的优雅停机 server.shutdown graceful 等待在途请求完成超时 30 秒默认——PreDestroy 后台任务的清理 Spring 容器管理——SmartLifecycle 接口自定义组件的启停 phase 排序。
3. 超时与强制优雅等待有上限 grace period——超时后强制关闭在途请求可能失败客户端重试——K8s 的 terminationGracePeriodSeconds 与 Spring 的 graceful period 对齐后者不超过前者。

## 参考分析

### 机制:优雅停机的三阶段

入口停止 停止接收新请求网关摘流量 Server 关闭 connector。在途完成 已接收的请求处理完成等待超时。后台停止 Scheduled 停止调度异步线程等待完成 MQ 消费者停止。三阶段的顺序与超时 入口先行在途次之后台最后 每阶段有超时上限。

### 反例:停机不优雅的两种事故

事故一 入站请求丢失 SIGTERM 后未停接收新请求 在途请求失败。事故二 后台任务中断 Scheduled 任务被 SIGKILL 杀死 数据不一致。修复 server.shutdown graceful 加 PreDestroy 清理加 SmartLifecycle 排序。

### 取舍:grace period 的设定

grace period 等于最长请求处理时间 加缓冲——过长 K8s 等不及被 SIGKILL 过短 在途请求被中断。K8s 的 terminationGracePeriodSeconds 必须 >= Spring 的 graceful period 两个超时对齐。

## 案例

### 验证:优雅停机的断言组

验证:入口停止断言(SIGTERM 后新请求被拒或重定向);在途完成断言(已接收的请求处理完成才关闭);后台停止断言(Scheduled 停止调度异步线程等待完成);超时断言(超过 grace period 强制关闭)——四组固化优雅停机。

### 追问链:停机三刀

一刀:K8s 的停机流程 SIGTERM preStop hook terminationGracePeriodSeconds SIGKILL Spring 的 graceful period 不超过 K8s 的 grace period 否则被 SIGKILL。二刀:后台任务的停机 Scheduled 的关闭调度器 shutdown 等待当前任务完成 异步任务的停机线程池的关闭。三刀:停机的演练停机演练 SIGTERM 注入验证三阶段的执行 停机的验证。

## 总结点

1. 入口停止在途完成后台停止
2. graceful period 对齐 K8s
3. 演练验证三阶段
