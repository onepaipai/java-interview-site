<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)

</details>

## 参考回答

1. 同步实例方法使用 this，静态方法使用声明类的 Class，代码块使用指定对象；不同锁不会因为都写 synchronized 就互斥。
2. 所有共享读改写遵守同一稳定锁，尤其静态状态不能由多个实例各锁自己；读路径也不能绕过协议。
3. 可重入和异常自动退出监视器不等于业务回滚；避免用公开对象、字符串常量或持锁执行慢远程调用。

## 案例

1. 场景（教学示例）：多次更新一个计数，写与读统一封装在同一私有锁中。

2. 只暴露受同一锁保护的 add 与 read，不返回内部锁对象。

```java
class Counter {
    private final Object lock=new Object(); private int count;
    void add() { synchronized(lock) { count++; } }
    int read() { synchronized(lock) { return count; } }
}
var counter=new Counter(); counter.add(); counter.add(); System.out.println(counter.read());
```

3. 预期：2；并发验证应构造多调用者并等待完成，另外核对异常业务是否需恢复状态，不能把自动解锁当自动回滚。

## 总结点

1. 同一状态遵守同一稳定锁。
2. 自动解锁不代表业务回滚。
