<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)

</details>

## 参考回答

1. 核心配置包括 corePoolSize、maximumPoolSize、keepAliveTime、队列、线程工厂和拒绝策略，线程与队列边界要共同评审。
2. 典型提交流程先尝试核心工作线程，再入队；入队失败再尝试增至最大，仍失败或已关闭时进入拒绝策略。
3. 入队与关闭竞争时执行器还会复查状态；拒绝可能抛异常、调用者执行或丢弃，不能统一解释为已接收。

## 案例

1. 场景（教学示例）：核心 1、最大 2、队列容量 1，两个运行任务都由闸门暂时占住。

2. 按顺序提交：第一个占核心、第二个排队、第三个扩至最大、第四个触发明确拒绝；最后统一释放和关闭。

3. 预期：饱和时运行不超过 2、排队不超过 1，第四个调用获得明确失败结果；同时观测排队年龄及 Future 终态。

## 总结点

1. 先核心再排队再最大。
2. 拒绝结果必须明确交付调用者。
