<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对象沙盘:new Object() 背后五步与对象三区域布局(头/实例数据/对齐填充)——JOL 工具可验证(第 5 题 JVM 实测)。

1. 创建五步:类加载检查→分配内存(TLAB 指针碰撞或空闲列表)→初始化零值→设置对象头(Mark Word+Klass Pointer)→执行构造器;TLAB=线程私有分配缓冲(无锁)。
2. 对象布局:对象头(Mark Word 8B+Klass Pointer 4B 压缩)+实例数据(字段)+对齐填充(8 字节倍数);JOL 实测:Integer 16B(12 头+4 值对齐)。
3. JIT 优化:逃逸分析→标量替换(未逃逸对象拆为标量不分配)+锁消除(未逃逸的 synchronized 移除)——第 80 题 JVM 详解。

## 参考分析

### 机制:TLAB 无锁分配

TLAB=每线程在 Eden 预分配的私有缓冲,指针碰撞分配(移动指针即可,无 CAS);TLAB 用完再 CAS 申请新 TLAB。类比食堂:每人专用餐盘架(无抢锁),架空再从大货架补。

### 边界:大对象与逃逸

大对象(>region 一半)绕过 TLAB 直接进老年代 Humongous(第 45 题);逃逸分析:未逃逸对象→标量替换(不分配)+锁消除(第 80 题);构造器 this 逃逸→final 字段保证失效(并发基础 38 题)。

### 取舍:压缩指针的条件

堆<32GB 时 UseCompressedOops(引用 4B)>32GB 自动关闭(引用 8B→内存跳涨)——堆从 31GB 调到 33GB 可用内存反而变少(压缩指针失效的临界点,第 76 题 JVM)。

## 案例

### 验证:对象布局的 JOL 走查

验证:JOL 实测(第 5 题 JVM):Integer 16B/Long 24B/空对象 16B;压缩指针开启 vs 关闭的字节数对照;JFR ObjectAllocationSample(分配路径);TLAB 日志(-Xlog:gc+tlab=debug)。验证:对象布局断言可程序化(JOL)。

### 追问链:布局三刀

一刀:字段重排=JVM 自动按类型排序减少填充(long→int→short→ref)。二刀:数组对象额外 4B 存长度,元素连续存储。三刀:this 逃逸→final 保证失效(并发基础 38 题)——构造完成才发布。

## 总结点

1. 五步创建,TLAB 无锁
2. 头+数据+填充=布局
3. JOL 验证,压缩指针省一半
