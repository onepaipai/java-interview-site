<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [github.com · 1](https://github.com/openjdk/jdk17u/blob/master/src/hotspot/share/opto/compile.cpp)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银风控规则引擎沙盘:规则方法经多轮迭代膨胀到 240 字节,压测吞吐低于重构前。用本机 PrintInlining 实测解释内联预算、失败形态与后续优化链,并给出守卫方法。

1. 内联是优化的入口:不内联就没有跨方法逃逸分析与消除,热点路径退化为"每步都是真调用"。
2. 失败形态有两条预算线:冷方法 MaxInlineSize(默认 35 字节码)与热方法 FreqInlineSize(默认 325);实测 4 字节方法恒内联,240 字节方法冷时 callee is too large、热后 inline (hot)。
3. 守卫靠观测与拆分:PrintInlining 看失败原因,超限大方法按分支拆小,反射与动态调用的调用点要在热路径上固化。

## 参考分析

### 机制:预算线与内联决策

C2 内联决策按调用点字节码大小与热度:超过 MaxInlineSize(35)的方法仅当调用点变热(计数超阈值)才按 FreqInlineSize(325)评估;递归深度、已是"大方法"的调用者等再打折。实测(Java 17.0.17,PrintInlining):
```
InlineExp::small (4 bytes)    inline (hot)      <- 恒内联
InlineExp::big (240 bytes)    callee is too large ×3   <- 冷,超 35 预算
InlineExp::big (240 bytes)    inline (hot)      <- 热点后,325 内放行
```
同一方法两种命运,差异只在调用点热度——这就是"经常调用的大方法可以内联,偶尔调用不行"的直接证据。

### 反例:三层包装把热路径拆成真调用

规则引擎常见写法:RuleEvaluator.evaluate 调 Rule.check 调 Validator.validate,各层百来字节,层层数据包装。每层冷调用点超 35 预算,热后 325 预算也常被中间层叠加撑爆(PrintInlining 连续 too large)。后果:逃逸分析穿不透,包装对象无法栈上分配,G1 分配速率虚高;性能形态是"CPU 不高但吞吐低"——调用与分配开销占满。

### 取舍:拆方法与守预算的边界

拆分原则:热路径主链方法控制在一屏内、分支下沉为独立小方法(小方法恒内联,无成本);少见的分支保持独立,不进主链字节量。参数面:特殊场景可调 FreqInlineSize(如 500),但会拉长 C2 编译时间并挤占编译资源,优先重构而不是调参。观测面:压测脚本固定 PrintInlining 输出 diff,内联失败清单作为重构 todo 的一部分进评审。

## 案例

### 实证:双预算线的直接观测

命令与输出(Java 17.0.17):
```
java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining InlineExp
  @ 17  InlineExp::small (4 bytes)    inline (hot)
  @ 42  InlineExp::big (240 bytes)    callee is too large   (3 处冷调用点)
  @ 42  InlineExp::big (240 bytes)    inline (hot)          (1 处热点调用点)
```
验证:把 big 删减到 30 字节重跑,全部调用点内联;把 small 扩到 50 字节,冷调用点拒绝——预算线行为与机制描述一致,可复现。

### 追问链:内联三刀

一刀:"内联失败一定慢吗?"——不一定;未内联的调用有约几纳秒的调用开销,真正贵的是堵死了后续优化(逃逸分析、锁消除、向量化),要看整链而非单点。二刀:"怎么知道内联没发生却该发生?"——PrintInlining 的 too large/dont inline 原因注释,配合 JIT 编译日志(PrintCompilation)确认热点已编译;有热度又有失败原因就是重构信号。三刀:"去优化和内联什么关系?"——内联基于类型假设做激进优化,假设破坏触发去优化回退解释器(见第 27 题),内联越深,去优化代价越大,守预算也是在控风险敞口。

## 总结点

1. 不内联,免谈优化
2. 冷三十五,热三百二十五
3. 热链一屏内,分支拆小法
