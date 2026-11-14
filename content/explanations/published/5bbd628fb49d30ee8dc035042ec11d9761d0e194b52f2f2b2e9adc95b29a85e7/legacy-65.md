<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. AQS 围绕状态与等待队列实现获取、阻塞、释放及唤醒。
2. ReentrantLock 支持限时、可中断、公平选项和多 Condition。
3. synchronized 自动释放且语法简单；选择依据真实控制需求和实测。

## 参考分析

1. 入队不是直接授予锁。
2. 非公平获取允许插队。
3. 锁实现与优化随 JDK 演进，偏向锁不能当作现代默认流程。

## 案例

1. 场景（教学示例）：多个线程争用一个限时可重入锁。
2. 处理：记录获取延迟、阻塞时长与持有栈，对比公平和非公平实现。

3. 验证：能区分长持锁与排队问题；调优以实际 JDK 的监视器指标为准。

## 总结点

1. 排队不等于得锁。
2. 先缩短持锁。
