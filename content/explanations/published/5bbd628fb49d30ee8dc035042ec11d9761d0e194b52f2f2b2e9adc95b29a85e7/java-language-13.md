<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银沙盘:finally 里 return 99 覆盖 try 的 return 1(本机实验:tryReturn 返回 1——finally 修改局部变量不影响,但 finally 里 return 会覆盖)——finally return 的三重伤害:吞异常/覆盖返回值/编译器警告。

1. 本机实验(J1):try { return r; } finally { r = 99; } 返回 1——finally 修改局部变量不影响返回值(返回值在 return 时已拷贝);但 finally { return x; } 直接覆盖 try 的任何 return/异常——finally 的 return 是"最终发言权"(吞一切)。
2. 三重伤害:一,吞异常(try 抛异常,finally return 把异常吞掉——调用方以为成功);二,覆盖返回值(try 的 return 作废);三,语义混乱(调用方无法推断哪条路径的返回值)——编译器给 warning("finally block does not complete normally")。
3. 正确姿势:finally 只做清理(资源关闭/日志——不 return 不 throw);返回值在 try 内确定;finally 的清理失败不吞主流程(suppressed,第 12 题分布式 try-with-resources)。

## 参考分析

### 机制:返回值拷贝与 finally 覆盖

try return 的执行序:计算返回值→暂存→执行 finally→(finally 无 return)→返回暂存值——finally 修改局部变量 r 不影响暂存副本(实测返回 1)。finally return 的执行序:try 的 return 暂存→finally 执行→finally 的 return 直接返回(覆盖暂存,吞 try 的异常)——finally 的 return 是"无条件最终返回"。编译器 warning 的依据是 JLS §14.20.2(finally 非正常完成:try 的异常被丢弃、返回值被覆盖)——warning 即护栏。

### 反例:finally return 的资损事故

沙盘:转账方法的 finally 里 return false(日志记录失败的兜底)——try 内成功转账返回 true 被 finally 覆盖为 false——调用方以为失败重试(双花,分布式 7 题)。修复:finally 去 return(返回值在 try 内确定);失败兜底的语义用显式 try-catch(catch 后决定返回值)——兜底逻辑不放 finally。

### 取舍:finally 的合法内容

合法:资源关闭(try-with-resources 替代)、日志(不抛)、状态复位(锁释放[显式锁,第 21 题])。禁忌:return/throw/改变返回值(语义覆盖)/长时间操作(异常窗口)。现代替代:try-with-resources 吃掉大部分 finally 场景——剩余 finally(锁释放)只做 finally 锁 unlock(第 21 题JVM)。

## 案例

### 验证:finally 行为的断言组

验证:副本断言(finally 修改局部变量不影响返回——J1 实测返回 1);覆盖断言(finally return 覆盖 try 返回值与吞异常——复现);warning 断言(编译器的 finally warning 出现)——三组固化 finally 纪律;finally 去 return 的重构用例(兜底逻辑显式化)对照。

### 追问链:finally 三刀

一刀:"finally 一定执行吗?"——System.exit/JVM 崩溃/线程被杀不执行——finally 的执行边界(第 19 题distributed OOMKilled 同源);守护线程的 finally 不保证。二刀:"finally 与锁?"——显式锁的 unlock 必在 finally(获取与释放配对,第 21 题JVM)——finally 的最后合法阵地;try-with-resources 对 Lock 的适配(自定义 AutoCloseable 包装锁)。三刀:"finally 与异步?"——异步回调的"finally"(finallyAsync)——异步资源释放的语义(CompletableFuture.whenComplete)——同步 finally 的思想在异步的映射。

## 总结点

1. finally 只清理,不发言
2. 副本机制:改局部不影响返回
3. 吞异常是资损级反模式
