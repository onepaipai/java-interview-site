<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

1. HashMap 没有共享修改所需的同步；并发 put、扩容和读取之间缺少完整的可见性及结构保护。
2. 外部锁必须覆盖同一组读写；改用 ConcurrentHashMap 后，get 再 put 仍不是原子组合。
3. 计数用 merge 或 compute 等单键原子操作；值对象和跨键不变量仍需单独保护。

## 案例

1. 场景（教学示例）：计数初值为 0，两个线程都先读取旧值，再分别写入旧值加一。

2. 交错：用屏障保证两次读取均先完成；随后两个线程各写入 1，预期最终只有 1。

```text
线程 A: read count=0 ── 屏障 ── put count=1
线程 B: read count=0 ── 屏障 ── put count=1
两个 put 都完成，最终 count=1；预期的两次累计应为 2。
```

3. 修复验证：对 ConcurrentHashMap 使用 merge("count",1,Integer::sum)，两次更新后应为 2；仅替换容器而保留 get/put 仍有丢更新窗口。

## 总结点

1. 共享读写要有同步。
2. 单键复合操作用原子接口。
