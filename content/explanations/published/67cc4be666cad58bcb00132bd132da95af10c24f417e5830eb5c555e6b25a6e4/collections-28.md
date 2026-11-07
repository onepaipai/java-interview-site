<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Deque.html)

</details>

## 参考回答

1. Deque 明确提供 push、pop、peek 等栈操作；Stack 继承 Vector，暴露了与栈纪律无关的下标修改接口。
2. 单线程栈常选 ArrayDeque，数组存储且拒绝 null；空栈 pop 抛异常，pollFirst 返回 null，接口边界要明确。
3. ArrayDeque 不提供并发安全；换成并发 Deque 也不让多步业务自动原子，不能把替换类名当成并发改造。

## 案例

1. 场景（教学示例）：用 Deque 接口表达后进先出，分别观察正常弹出和空栈返回。

2. 核心代码。

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2);
System.out.println(stack.pop());
System.out.println(stack.pop());
System.out.println(stack.pollFirst());
```

3. 预期：2、1、null；改用 pop 处理最后一次空栈会抛 NoSuchElementException，业务应预先选定一种契约。

## 总结点

1. 栈用 Deque 表达。
2. 空栈边界按接口处理。
