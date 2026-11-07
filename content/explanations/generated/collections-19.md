<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. size 在并发更新下反映一个观察值；即使此刻数值准确，后续 put 也不与检查组成原子操作。
2. “size 小于上限再写入”会让多个线程同时通过；限制全局在途量应先用信号量等机制原子申请许可。
3. 许可与实际任务生命周期绑定，写入失败归还、完成后只归还一次；跨进程额度应由共享的原子存储或事务维护。

## 案例

1. 场景（教学示例）：上限为 1，屏障保证两个提交者都先检查空表，再执行写入。

2. 核心代码。

```java
var values = new java.util.concurrent.ConcurrentHashMap<String,Integer>();
var gate = new java.util.concurrent.CyclicBarrier(2);
java.util.concurrent.Callable<Void> submit = () -> {
    boolean allowed = values.size() < 1;
    gate.await();
    if (allowed) values.put(Thread.currentThread().getName(), 1);
    return null;
};
var a = new java.util.concurrent.FutureTask<Void>(submit);
var b = new java.util.concurrent.FutureTask<Void>(submit);
new Thread(a, "A").start(); new Thread(b, "B").start();
a.get(); b.get();
System.out.println(values.size());
```

3. 预期：size 为 2，明确复现超额。修复后先 tryAcquire(1)，同一许可只允许一个任务进入，失败及完成路径分别核对归还。

## 总结点

1. 先检查再写入仍有竞态。
2. 额度先原子申请再执行。
