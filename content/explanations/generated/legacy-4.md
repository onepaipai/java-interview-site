<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银代码评审沙盘:三个关键字语义完全不同——final(不可变修饰符)、finally(异常处理必执行块)、finalize(对象回收回调,已废弃)——混淆是初级 bug 的常见来源。

1. final:修饰符——类(不可继承)/方法(不可覆写)/变量(不可重新赋值;引用类型=引用不可变,对象内容可变);final 的线程安全语义:final 字段的初始化安全(JLS 17.5,并发基础 38 题)。
2. finally:try-catch 的必执行块——资源释放(try-with-resources 替代大部分场景)/日志/状态复位;禁忌:finally 中 return/throw(覆盖 try 的返回值与吞异常,JLS §14.20.2,第 13 题 java-language)。
3. finalize:对象 GC 回收前的回调——不可靠(时机不保证/可能不执行/复活风险,JEP 421 已废弃,第 11 题 JVM);替代=try-with-resources(确定性)+Cleaner(兜底);Java 18 起 --finalization=disabled 可关停。

## 参考分析

### 机制:final 的三层含义

final 类(String/Integer):防止继承(安全+设计意图);final 方法:防止覆写(模板方法的固定步骤);final 变量:基本类型=值不可变;引用类型=引用不可变(指向的对象内容可变——final List 可以 add,不可重新赋值)。final 与不可变集合(List.of/Map.of)的组合是"真正的不可变"(第 43 题 collections)。

### 反例:三个关键字的混淆事故

事故一:final List 添加元素——final 只锁引用,add 仍有效(误以为不可变);修复=List.of 或 Collections.unmodifiableList(第 43 题)。事故二:finally 中 return——覆盖 try 返回值+吞异常(资损级,第 13 题);修复=finally 只做清理。事故三:finalize 做资源释放——句柄耗尽(Finalizer 单线程积压);修复=try-with-resources+Cleaner 兜底(第 11 题 JVM)。

### 取舍:final 的使用原则

能用 final 就用 final(参数/局部变量/字段——防止意外修改,提高可读性);类是否 final:工具类/不可变类 final,有子类需求的不要;方法是否 final:模板方法骨架 final,步骤方法不 final——final 的价值=表达设计意图(这段代码不可修改)。

## 案例

### 验证:三个关键字的走查核对

验证:final 断言(final 变量重新赋值编译错;final List 可 add);finally 断言(finally return 覆盖 try 返回值——J1 实测返回 1 非 99;finally 吞异常);finalize 断言(对象回收前 finalize 被调但时机不确定)——三组固化三个关键字的语义边界。

### 追问链:三关键字三刀

一刀:"finally 一定执行吗?"——System.exit/JVM 崩溃/线程被杀不执行(第 13 题追问链);守护线程的 finally 不保证。二刀:"final 与并发?"——final 字段的初始化安全(JLS 17.5:构造完成且 this 未逃逸→任何线程看到正确值,无需同步,并发基础 38 题);安全发布=final 引用或 static 初始化。三刀:"finalize 与 Cleaner?"——Cleaner(虚引用实现,无复活风险)仍受 GC 时机约束——Cleaner 是"更安全的兜底"不是"更及时的保障"(第 12 题 JVM)。

## 总结点

1. final 锁引用不锁内容
2. finally 只清理,不发言
3. finalize 已废弃,用 try-with-resources
