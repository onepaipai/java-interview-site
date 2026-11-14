<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Math.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银转账沙盘:两笔 int 金额相加溢出(2147483647+1=-2147483648)——溢出环绕(资金错误)+溢出检测(Math.addExact 抛异常)+类型升级(long)+上限校验——溢出的三层防御。

1. 溢出的形态:int 的环绕(加法溢出/乘法溢出)、long 的溢出(更大但仍可溢出)、隐式溢出(自动装箱的 Long 累加不会溢出[Long 是 long]但 int 相加赋给 long 仍先溢出[int + int 先按 int 算])。
2. 三层防御:类型升级(int→long:1/0 路径的金额一律 long 分,第 3 题)、精确运算(Math.addExact/multiplyExact/subtractExact——溢出抛 ArithmeticException,错误前移)、上限校验(业务上限:转账单笔上限——超限拒绝,第 23 题 banking 限额)。
3. Java 8 的 Math 精确方法:addExact/multiplyExact/subtractExact/negateExact——溢出即异常(不静默环绕)——精确运算的默认纪律(资金路径)。

## 参考分析

### 机制:环绕、精确运算与隐式提升

环绕:int 的二进制补码环绕(最大+1=最小)——静默(无异常无警告)——资金错误最隐蔽的形态。隐式提升的陷阱:int + int 先按 int 计算(结果可能已溢出)再赋给 long——(long)a + b 才安全(先提升再算)——隐式提升的时序(表达式内类型提升)。Math 精确:addExact(a,b)——溢出抛 ArithmeticException("integer overflow")——显式(错误前移)。

### 反例:溢出的两种事故

事故一,金额累加溢出:日累计金额 int 累加——超过 21.47 亿分(2147 万)溢出为负——限额判断失效(负数<上限恒真)——超限放行(资金风险)。事故二,容量计算溢出:容量 = count * itemSize——int 乘法溢出(负容量)——分配失败或异常行为。两条的正解:金额一律 long(Math.addExact)、容量计算 Math.multiplyExact 或 long 提升——溢出的防御路径显式。

### 取舍:溢出策略的分级

严格(资金):Math.addExact——溢出即异常(拒绝操作,错误前移)。宽松(非资金统计):普通运算+周期校验(溢出的容忍——统计误差可接受)。防御检查:Math.subtractExact 的结果<0(下溢检测——余额扣减的负数检查)。分级的判据:溢出的后果(资金>统计)——后果决定严格度。

## 案例

### 验证:溢出的断言组

验证:环绕复现断言(Integer.MAX_VALUE+1 的环绕——实测);精确断言(Math.addExact 的溢出异常——错误前移);隐式提升断言(int+int 赋 long 的溢出——先 int 后 long 的陷阱复现)——三组固化溢出防御;Math 精确方法的使用规范(资金路径必用)进 checklist。

### 追问链:溢出三刀

一刀:"long 的溢出?"——long 也有上限(9.2E18)——long 分的万亿级安全(1 亿×万=1E14<9.2E18)——long 的量级足够绝大多数资金(超大额的 BigDecimal,第 2 题)。二刀:"无符号运算?"——Java 无无符号(int 有符号)——Integer.toUnsignedLong(无符号解读)/divideUnsigned——无符号的补丁 API(网络协议的字节解读)。三刀:"溢出的测试?"——边界值测试(Integer.MAX_VALUE/MIN_VALUE 附近的运算——边界值进单测模板,第 44 题)——溢出的测试覆盖(边界值用例)。

## 总结点

1. int 环绕静默,long 升级防溢出
2. Math.addExact 错误前移
3. 资金路径精确运算必用
