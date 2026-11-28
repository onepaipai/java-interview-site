<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [HTTP 规范 · 1](https://www.rfc-editor.org/rfc/rfc793.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银夜审沙盘:应用 netstat 出现数千 CLOSE_WAIT,内存连接对象堆积,新连接建不起来——CLOSE_WAIT 是被动关闭方收到 FIN 后未调用 close 的状态,堆积=应用代码漏关,是资源泄漏的明确信号。

1. 语义:被动方收到 FIN 回 ACK 进入 CLOSE_WAIT,等待应用调用 close 发出自己的 FIN——期间连接及其句柄/缓冲全部占着;TIME_WAIT 是协议计时,CLOSE_WAIT 是应用欠账。
2. 本机实测:服务端收到客户端 FIN 后不调用 close,CLOSE_WAIT=1;调用 close 后快照 CLOSE_WAIT=0——状态随应用 close 立即消失,证明堆积根源在应用未关闭。
3. 常见根因:异常路径没走 finally 关连接、连接池泄漏(借出不还)、读循环遇异常直接 break、客户端断开后服务端线程阻塞在写——排查先看连接对象生命周期,再看线程栈。

## 参考分析

### 第二步扩展① 机制:被动关闭方欠的那一步

- 四次挥手完整状态机(RFC 793):主动方发 FIN 进 FIN_WAIT_1,收 ACK 进 FIN_WAIT_2。
- 被动方收 FIN 回 ACK 进 CLOSE_WAIT——卡在第二与第三步之间,协议在等应用交出关闭权。
- 被动方 close 后发自己的 FIN 进 LAST_ACK,收到主动方最后的 ACK 即关闭。
- 主动方收 FIN 回 ACK 后进 TIME_WAIT 停留 2MSL。
- 与 TIME_WAIT 的本质区别:TIME_WAIT 有计时器必然消失,CLOSE_WAIT 没有计时器,不 close 就永远在——所以监控上 CLOSE_WAIT 持续增长是应用缺陷,TIME_WAIT 高位平稳是行为特征。

### 第二步扩展② 反例:CLOSE_WAIT 堆积的三种事故

- 事故一:WebSocket 推送线程对断开的连接写数据抛异常,catch 后没关 socket——每断开一个客户端涨一个。
- 事故二:HTTP 客户端连接池 maxIdle 配置过大且无驱逐,服务端先关后借出的连接处于 CLOSE_WAIT 被复用再报错。
- 事故三:文件句柄连带耗尽——CLOSE_WAIT 也占 fd,堆积到 fd 上限后新文件、新连接全部失败。

### 第二步扩展③ 取舍:监控与自愈的边界

- 监控:CLOSE_WAIT 数量阈值告警+按连接归属进程下钻,定位到代码路径。
- 自愈:不可靠——自动 kill 连接治标,泄漏点还在。
- 框架兜底:连接池开启空闲驱逐与存活校验、Netty 关闭事件必触发 ChannelFuture 回收——自愈是兜底,正确关闭路径才是解。

## 案例

### 第三步发散·验证与推演 验证:堆积与消失的实测证据

- 本机实测(JDK 17.0.17+netstat,与 Q6 同一实验):
~~~
java N2ConnStates
快照1:CLOSE_WAIT=1(被动方=服务端应用没调 close)
快照2(服务端 close 后):CLOSE_WAIT=0(应用关了立即消失)
快照2:TIME_WAIT=31(只能等计时衰减,代码跳不过)
~~~
- 验证:不调 close 则 CLOSE_WAIT 停留,调 close 则归零,同一时刻 TIME_WAIT 仍在——两类状态"应用可控/协议计时"的对照成立。

### 第三步发散·发散要点 追问链:CLOSE_WAIT 三刀

- **追问①**：CLOSE_WAIT 与 FD 上限的联动——每个 CLOSE_WAIT 占一个 fd,堆积先撞 fd 上限(ulimit),表现为 open too many files,容易被误诊为文件系统问题
- **追问②**：半关闭(shutdownWrite)的合法用途——写完请求半关闭表示"我发完了",此时连接停留在 CLOSE_WAIT 是设计内状态,不算泄漏(见 Q4 分帧)
- **追问③**：容器环境的观察——CLOSE_WAIT 计数在容器 netns 内,宿主机 netstat 看不全,健康检查要做进容器(见 Q41)

## 总结点

1. CLOSE_WAIT 等应用 close
2. 堆积=连接对象泄漏
3. 监控告警自愈兜底
