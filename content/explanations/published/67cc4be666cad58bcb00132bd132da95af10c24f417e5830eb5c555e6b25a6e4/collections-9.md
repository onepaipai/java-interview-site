<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedList.html)

</details>

## 参考回答

1. ArrayList 下标访问 O(1)，中间插删需移动后缀；LinkedList 按下标定位 O(n)，已持有迭代器位置才可常数时间改链。
2. 遍历 LinkedList 应使用迭代器，逐下标 get 会把整轮访问变成 O(n²)；两边必须比较相同访问语义。
3. 还要计入数组局部性、链表节点分配及 GC；不能把“插入多”直接等同于 LinkedList 更快。

## 案例

1. 场景（教学示例）：按下标读取一万项后再插入，与已持有中间迭代器的插入是两个不同任务。

2. 验证：分别测随机定位、迭代遍历、已定位插删；固定输入及访问方式，记录分配和尾延迟，不用一次循环计时给出通用胜负。

## 总结点

1. 链表插入之前可能先走链。
2. 比较先统一访问语义。
