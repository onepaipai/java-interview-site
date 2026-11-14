<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 JIT 沙盘:逃逸分析(对象是否逃出方法/线程)→标量替换(未逃逸对象拆为标量,不分配)+锁消除(未逃逸的 synchronized 移除)+JIT 编译(C1/C2 分层编译)——第 80 题 JVM 的完整版。

1. 逃逸分析(Escape Analysis):分析对象的作用域——未逃逸(不逃出方法/不逃出线程)→可优化;逃逸(被返回/存入静态字段/传入方法/赋给字段)→不可优化;逃逸分析是 JIT 的前置分析(决定是否做标量替换/锁消除)。
2. 标量替换:未逃逸对象拆解为标量(基本类型局部变量)——不分配堆内存(对象不存在,只有局部变量);锁消除:未逃逸对象的 synchronized 移除(无竞争不需要锁)——两者都是逃逸分析的红利(JIT 日志可观测)。
3. JIT 分层编译:0 解释→3 C1+profiling→4 C2 深度优化(默认路径)——C1 快速出活,C2 深度优化(内联/逃逸分析/向量化);去优化:假设失效(类型 profile 变化)→回退到解释器(第 24 题 JVM OSR);JIT 的触发=调用计数+回边计数达到阈值(第 24 题 OSR)。

## 参考分析

### 机制:逃逸分析→优化的决策链

逃逸分析的结果决定后续优化:未逃逸→标量替换(不分配)+锁消除(不需要);全局逃逸→无法优化(对象在堆分配);参数逃逸→部分优化(内联后可能不逃逸)——逃逸分析本身有开销(分析阶段),JIT 只在 C2 层做(高频方法才值得分析)。

### 反例:JIT 的两种事故

事故一:基准测试不预热——JIT 未介入(解释器模式),性能低(第 25 题微基准预热);修复=JMH 预热或多轮 iteration。事故二:去优化循环——单态假设失效(新类型出现)→去优化到解释器→重新 profiling→重新编译(性能锯齿,第 27 题 JVM 去优化);修复=避免多态热点(或接受锯齿)。

### 取舍:JIT 参数的调优边界

-XX:CICompilerCount(编译线程数)/-XX:FreqInlineSize(内联阈值)/-XX:MaxInlineSize(小方法内联)——JIT 参数的调优=压测验证(第 147 题),不是理论推导;JIT 的行为随 JDK 版本变化(第 50 题升级的隐式契约——JIT 优化是版本相关的)。

## 案例

### 验证:JIT 的走查核对

验证:J1 实验(装箱 6ns vs 原始 1ns——JIT 内联后差距缩小);PrintInlining 实验(small inline hot/big callee too large——内联决策可观测,第 80 题 JVM 实测);JFR 的 Compilation/Deoptimization 事件(JIT 的编译与去优化全记录);OSR 断言(长循环中途切换到编译版,第 24 题 JVM)。验证:JIT 行为的断言可程序化(-Xlog:jit+compilation=info)。

### 追问链:JIT 三刀

一刀:"逃逸分析能消除所有堆分配吗?"——不能:逃逸的对象(返回/存储/传入)无法消除;分析本身有成本(只在 C2 层);标量替换有条件(对象简单/字段少)——逃逸分析是优化机会不是保证。二刀:"JIT 与反射?"——反射调用无法被 JIT 内联(间接调用);MethodHandle 可以被 JIT 优化(invokeExact 直接调用);LambdaMetafactory 生成类可被内联(第 19 题 java-language 的性能对照)。三刀:"JIT 的去优化触发?"——类型 profile 变化(单态→多态)/分支预测失效/OSR 编译假设失效——去优化不是 bug 而是"假设验证失败"的正常回退(第 27 题 JVM)。

## 总结点

1. 逃逸分析→标量替换+锁消除
2. JIT C1 快速出活,C2 深度优化
3. 去优化=假设验证失败的正常回退
