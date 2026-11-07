<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. ConcurrentHashMap 的映射函数应短小；OpenJDK 17 的桶级协调会让慢回调拖住相关更新，碰撞键也可能受影响。
2. 可先原子安装 FutureTask，再由胜者在 Map 回调外执行加载；等待者共享同一 Future，不在桶内等待网络。
3. 失败按 remove(key, sameFuture) 条件清理，避免删掉新代结果；还需定义超时、取消、过期和最大在途量。

## 案例

1. 场景（教学示例）：先安装一份惰性任务，让两个调用者复用结果；本例以本地计数代替远程调用。

2. 核心代码。

```java
var loads = new java.util.concurrent.atomic.AtomicInteger();
var map = new java.util.concurrent.ConcurrentHashMap<String,java.util.concurrent.FutureTask<Integer>>();
var candidate = new java.util.concurrent.FutureTask<Integer>(loads::incrementAndGet);
var old = map.putIfAbsent("K",candidate);
var shared = old==null?candidate:old;
if (old==null) candidate.run();
System.out.println(shared.get()+" / "+loads.get());
```

3. 预期：1 / 1；故障测试需验证加载失败后可重试、只删除当前 Future，以及等待超时不会误删仍供其他调用者使用的结果。

## 总结点

1. 桶内只做短原子协调。
2. 耗时加载放到回调之外。
