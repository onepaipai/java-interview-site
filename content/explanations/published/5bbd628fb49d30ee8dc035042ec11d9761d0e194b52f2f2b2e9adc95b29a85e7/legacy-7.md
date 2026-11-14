<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银交易沙盘:SQLException(checked)强制处理 vs RuntimeException(unchecked)随意传播——checked 编译期强制 catch,unchecked 运行期暴露;finally 的 return 覆盖 try 返回值。

1. 异常体系:Throwable→Error(JVM 级)与 Exception;Exception 分 checked(IOException/SQLException——编译器强制处理)与 unchecked(RuntimeException,不强制)。
2. try-finally 执行序:try 计算→暂存返回值→执行 finally→无 finally return 则返回暂存值;finally 有 return 则直接返回(覆盖暂存,吞异常)——finally 的 return 是"无条件最终返回"(J1 实验:返回 1 非 99)。
3. 最佳实践:checked 用于"可恢复的外部异常"(调用方可做点什么);unchecked 用于"程序缺陷"(调用方无法恢复,应修代码);finally 只做清理,不 return 不 throw(第 13 题 java-language)。

## 参考分析

### 机制:checked 与 unchecked 的设计意图

checked 异常=调用方"应该知道并处理"的可预期异常(文件不存在/网络断开)——编译器强制处理,防止遗漏;unchecked=程序缺陷(空指针/越界)——调用方无法恢复,应该修代码而不是 catch。类比安全带提醒: checked=上车提醒系安全带(可预防),unchecked=撞车(发生了再处理已晚)。

### 反例:异常处理的两种事故

事故一:catch(Exception e) {}(空 catch)——吞掉所有异常,问题静默(最难排查的 bug);修复=至少记日志或 rethrow。事故二:catch 后不恢复中断标志——InterruptedException 被吞,线程池 shutdownNow 失效(并发基础 10 题);修复=Thread.currentThread().interrupt() 或向上传播。

### 取舍:checked 的争议

checked 异常的支持者:强制处理减少遗漏(编译期保障);反对者:函数式/流式代码中 checked 是阻碍(必须包装成 unchecked);Java 8 的 Stream 不支持 checked——实践:外部 IO 用 checked,业务逻辑用 unchecked(继承 RuntimeException);不让 checked 异常污染函数式管道。

## 案例

### 验证:异常体系的走查核对

验证:J1 实验——try-finally 副本返回(返回 1 非 99);finally return 吞异常(try 抛异常→finally return→异常消失);checked 编译检查(不 catch 不 throws→编译错)——三组固化异常体系行为。

### 追问链:异常三刀

一刀:"try-with-resources?"——编译器生成确定性关闭(资源关闭+异常抑制,第 12 题分布式)——替代大部分 try-finally;AutoCloseable 接口。二刀:"异常链(cause)?"——new Exception("msg", cause) 保留原始异常栈——追溯根因(不丢失原始上下文)。三刀:"异常与性能?"——异常构造含栈回溯( costly,第 1 题异常基准:1M 次抛 vs 0 抛 = 0-51ms 波动);不要用异常做流程控制(性能杀手)。

## 总结点

1. checked 编译强制,unchecked 运行暴露
2. finally return 吞异常覆盖返回
3. 异常是缺陷信号,不做流程控制
