<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashSet.html)

</details>

## 参考回答

1. HashSet<String> 除字符数据外，还保留 String、底层字节数组、Map 节点和桶数组；字符串重复与对象共享也会改变开销。
2. 用堆转储看对象数量及保留路径，区分多份相同内容、真正唯一值和容量峰值；不要只统计文本字节数。
3. 可按业务使用紧凑数字 ID、分区外存或受控去重；不可盲目对海量外部字符串 intern，移入驻留池不等于释放业务强引用。

## 案例

1. 场景（教学示例）：一千万条字符串订单号长期驻留，字符量估算低于进程实际占用。

2. 验证：用代表性样本拆分 String、数组、节点、桶占用，再验证紧凑 ID 或分区方案的精确性；禁止用丢弃高位或有碰撞的短哈希冒充无损压缩。

## 总结点

1. 字符量不是集合总内存。
2. 紧凑表示仍需保证无歧义。
