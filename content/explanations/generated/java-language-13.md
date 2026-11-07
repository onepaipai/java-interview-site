<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.20.2)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.20.3)

</details>

## 参考回答

1. finally 正常结束时才保留 try/catch 原本的返回或异常。
2. finally 中的 return 或 throw 会覆盖此前控制流，可能把失败伪装成成功。
3. 资源清理应避免改变控制流；try-with-resources 的异常抑制规则需单独理解。

## 参考分析

1. 返回值先在 try 中求出，再执行 finally；finally 自己返回时，之前的返回结果被丢弃。
2. finally 抛出新异常时，旧异常也可能被遮蔽；普通 finally 不会自动把旧异常放入 suppressed。
3. try-with-resources 在已有主异常时，把资源关闭异常加入 suppressed；它不是任意清理代码的通用行为。

## 案例

1. 场景（教学示例）：try 抛异常，finally 却返回成功值；以下完整 Java 17 演示预期输出 2。

```java
class FinallyCase {
    static int value() {
        try {
            throw new IllegalStateException("失败");
        } finally {
            return 2; // 原异常被覆盖
        }
    }
    public static void main(String[] args) {
        System.out.println(value());
    }
}
```

2. 修复与验证：移除 finally 的 return，仅保留清理；再次调用应向外抛出原 IllegalStateException。

## 总结点

1. 清理不改控制流。
2. finally 返回，旧结果作废。
3. 抑制异常先看资源管理规则。
