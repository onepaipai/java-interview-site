<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.4.2)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/BlockingQueue.html)

</details>

## 参考回答

1. 单例可用静态持有者或枚举；双重检查写法需要 volatile 保证安全发布。
2. 生产者消费者优先使用有界 BlockingQueue，明确满队列背压和空队列等待。
3. 等待要可中断；自行实现条件等待时循环检查条件，并设计关闭后唤醒和退出。

## 参考分析

1. 单例解决实例创建和发布，队列解决任务移交，两者需要分别验证。
2. 类初始化可用于持有者单例的安全发布；不能顺带保证单例内部可变业务状态线程安全。
3. BlockingQueue 本身没有统一关闭协议，应另定停机标记、取消或毒丸策略。

## 案例

1. 单例核心片段（Java 17，放在外部演示类内）：并发调用 get 应返回同一个实例。

```java
static final class Singleton {
    private Singleton() {}
    private static final class Holder {
        static final Singleton VALUE = new Singleton();
    }
    static Singleton get() { return Holder.VALUE; }
}
```

2. 队列场景：容量 1，先放 A；生产者 put B 等待，消费者 take A 后生产者才继续。

3. 验证：并发收集 get 的引用应全相同；队列取出顺序为 A、B，空队列 take 等待时中断应退出。

4. 停机验证：停止新任务后按既定协议唤醒等待方，不能只修改一个无人检查的关闭标志。

## 总结点

1. 单例靠安全发布，状态另同步。
2. 队列要有界，停机要能退出。
