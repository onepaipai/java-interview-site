<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/Buffer.html.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：文件分块上传的代码偶发 BufferUnderflowException，根因是忘了 flip。用"三个游标 + 一套状态切换"讲清 Buffer 状态机，给出读写切换的标准流程。

1. 三个索引的不变式：0 ≤ position ≤ limit ≤ capacity。position 是下一个读写的位置，limit 是不可越界的边界，capacity 是容量上限且创建后不变。
2. 写模式切换到读模式用 flip：limit=position，position=0——不 flip 直接 get 就会读越界或读到没写过的区域。
3. clear 与 rewind 语义不同：clear 把 position 归零、limit 还原为 capacity（准备重写，数据不清零）；rewind 只把 position 归零（重读当前有效段）。

## 参考分析

### 机制：一个数组配两套坐标

Buffer 本质是数组加游标组。写模式里 limit=capacity（能写到头），读模式里 limit=刚才写到的位置（只能读已有的）。类比录音带：capacity 是带长，写完一按 flip，"带尾"立刻变成"要听的终点"，从带头重放。所有异常都是游标越过了当前模式允许的范围。

### 边界：mark/reset 与 compact 的作用

mark 记住当前 position，reset 回到 mark（可撤销部分读取）；compact 把未读数据搬到头部、position 指向其后、limit=capacity——用于"半读半写"续写场景（网络缓冲常见）。四个切换方法对应四种意图：flip 换向、rewind 重读、clear 重写全量、compact 续写。

### 取舍：直接缓冲与堆缓冲的选择

HeapBuffer 数据在堆（受 GC 管理，经 socket 时会多一次拷贝到临时直接缓冲）；DirectBuffer 省拷贝但分配贵、释放靠 Cleaner（见第 33 题）。IO 型服务用池化 DirectBuffer，低频小量用 HeapBuffer——状态机部分两者完全一致，成本差异在数据落点。

## 案例

### 对照操作：flip 前后的游标打印

教学验证：capacity 10 的 HeapBuffer 写入 6 字节，打印三个游标（p=6,l=10,c=10）；flip 后再打印（p=0,l=6,c=10）；读 6 字节后 get 触发 BufferUnderflowException。预期输出与游标不变式逐条对应，实验可复跑，把状态机变成可背的打印序列。

### 追问：为什么读文件循环常用 hasRemaining

hasRemaining() = position < limit，它表达"当前模式下还有效的数据"，比手写 position < N 更能随 flip/compact 正确伸缩。手写游标边界是 BufferUnderflow/Overflow 的头号来源——让状态机自己管边界。

## 总结点

1. p 在读写，l 是边界，c 是容量
2. flip 换向：尾变终点头归零
3. clear 重写，compact 续写
