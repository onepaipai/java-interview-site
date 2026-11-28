<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)
- [OpenJDK 设计说明 · 2](https://openjdk.org/jeps/374)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：用 JOL 观察空对象与加锁对象的布局变化，解释 Mark Word 的分时复用设计，并说明它如何同时服务哈希、GC 与锁。

1. 对象头 = Mark Word + 类型指针：Mark Word 存哈希码、GC 分代年龄、锁状态标志，随生命周期分时复用同一批比特。
2. 类型指针（Klass Pointer）指向类元数据，压缩开启时占 4 字节；数组对象头里还有 4 字节长度。
3. 锁状态编码在同一 Mark Word：无锁、轻量级锁（栈上 Lock Record 指针）、重量级锁（monitor 指针）；偏向锁在 Java 15 起被废弃（JEP 374），Java 17 默认不存在。

## 参考分析

### 第二步扩展① 机制：Mark Word 是"一室多用"的告示牌

- 32 位 Mark Word 按锁状态切换含义：无锁时装身份（哈希 31 位 + 年龄 4 位），轻量级锁时换成栈上记录指针，重量级时换成 monitor 指针。
- 类比酒店房卡槽：同一张卡槽白天插工牌、晚上插房卡，插上谁就代表房间当前状态。
- GC 分代年龄只有 4 位，所以最大晋升阈值是 15（见第 44 题）。

### 第二步扩展② 边界：身份哈希与锁互斥占用

- 一旦调用了未重写的 hashCode，身份哈希被写入 Mark Word，这个对象就不能再进入偏向/轻量级的"无哈希"状态路径（轻量级锁会把哈希挪到 Lock Record 保存）。
- 哈希必须全局稳定，GC 移动对象也不能改它——这是 Mark Word 设计里哈希与压缩指针共存的关键约束。

### 第二步扩展③ 取舍：为什么读对象头要快

- 锁升级、GC 年龄判断、类型分发每次都要读 Mark Word，它位于对象起始 8 字节内、与类型指针相邻，缓存友好。
- 理解对象头是理解 synchronized 成本（见并发模块第 4 题）、`Integer` 等小对象内存占用（16 字节起步）与 JOL 布局输出的基础。

## 案例

### 第三步发散·验证与推演 对照操作：JOL 看锁前后的对象头

- 教学验证：用 JOL 打印 `new Object()` 的布局（16 字节：8 头 + 4 压缩指针 + 4 对齐），再对同一对象先调用 hashCode 再 synchronized 加锁，打印 Mark Word 十六进制变化。
- 预期：哈希写入后低位非零，加锁后变为栈记录指针。
- 实验可复跑，JOL 是讲解对象头的标准教具。

### 第三步发散·追问① 追问：为什么 Integer 占 16 字节

- 对象头 8 字节（64 位 JVM 上 Mark Word 恒 8 字节）加 4 字节 int 值与 4 字节压缩类型指针，对齐到 16。
- 真正省内存的是缓存（IntegerCache）与压缩指针，而不是改对象头。
- 这个算术常被用来检验是否真理解了布局。

## 总结点

1. 一头两件：Mark Word 加类型指针
2. Mark Word 分时复用：哈希、年龄、锁标志
3. 哈希一旦写入，锁路径要让位
