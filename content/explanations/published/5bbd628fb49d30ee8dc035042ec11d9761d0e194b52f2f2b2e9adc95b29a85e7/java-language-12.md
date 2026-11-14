<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/AutoCloseable.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银资源沙盘:try 块抛业务异常+close 也抛异常——try-with-resources 的语义:close 的异常被抑制(suppressed),业务异常为主异常抛出——getSuppressed() 可取被抑制的异常(排障完整)。

1. 机制:try-with-resources 中 try 体异常为主异常,多个 close 的异常按声明逆序附加为 suppressed——主异常+抑制链=完整故障信息(手写 finally 的"close 异常覆盖业务异常"问题的语言级解)。
2. 对比手写 finally:finally 中 close 抛异常会"吞掉"try 体异常(业务异常丢失)——try-with-resources 的 suppressed 机制解决了这个历史坑——资源清理的异常不该掩盖业务异常。
3. 两个资源的顺序:声明顺序=关闭逆序(后开先关——栈序)——依赖顺序的资源(包装流:BufferedOutputStream(FileOutputStream))按声明序保证关闭顺序正确。

## 参考分析

### 机制:主异常与抑制链

语义:try 体异常抛出;资源 close 异常→addSuppressed 附加;多个资源→每个 close 的异常依次附加(逆序关闭)。getSuppressed():Throwable[]——排障时抑制链可见(关闭失败的根因不丢)。对比 finally:finally 的异常覆盖 try 异常(业务异常丢失,历史坑)——try-with-resources 的诞生动机之一。

### 反例:finally 覆盖的事故

沙盘:try 体抛"余额不足"业务异常,finally 的 close 也抛 IO 异常——手写 finally 下 IO 异常覆盖业务异常(调用方收到"close 失败"而不是"余额不足")——业务语义丢失+排障误导。修复:try-with-resources——业务异常为主,IO 异常进 suppressed(主次分明)。

### 取舍:资源的声明与 AutoCloseable

声明顺序=关闭逆序:依赖资源的包装流按声明序(内层先声明先关闭?——声明序=打开序,关闭=逆序——BufferedOutputStream(FileOutputStream):声明 BufferedOutputStream 在前?实际 try (FileOutputStream fos = ...; BufferedOutputStream bos = new BufferedOutputStream(fos))——关闭序 bos→fos(包装层先关,先 flush 再关底层)——依赖顺序正确。AutoCloseable 的契约:close 幂等(可重复调用)、close 不抛中断以外的强异常(资源类的 close 纪律)。

## 案例

### 验证:抑制链的断言组

验证:主异常断言(try 体异常为主抛出——getSuppressed 含 close 异常);逆序关闭断言(多资源的关闭顺序=声明逆序——日志/断言);对照断言(手写 finally 的覆盖行为复现——历史坑实证)——三组固化 try-with-resources 语义;close 的幂等用例(重复 close 无害)补充。

### 追问链:资源三刀

一刀:"close 里做业务?"——close 做资源释放(不做业务提交——提交在 try 内显式,第 10 题distributed afterCommit 同构禁忌)——close 的职责边界。二刀:"Effectively final 资源?"——有效 final 变量可直接进 try-with-resources(Java 9+)——外部创建的资源也能用语法。三刀:"Lombok @Cleanup?"——@Cleanup=作用域结束自动 close(编译期生成)——与 try-with-resources 等价但作用域控制不同(方法级 vs 块级)——按作用域选。

## 总结点

1. 主异常保留,close 异常进 suppressed
2. 关闭逆序=声明序的反转
3. close 不掩盖业务异常
