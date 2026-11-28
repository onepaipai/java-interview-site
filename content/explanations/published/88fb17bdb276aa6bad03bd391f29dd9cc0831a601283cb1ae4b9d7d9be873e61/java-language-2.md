<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 BigDecimal API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银计息沙盘:new BigDecimal(0.1) 的精度陷阱(二进制浮点入参)、除法不指定 scale 抛 ArithmeticException、equals 与 compareTo 的差异(1.0 vs 1.00)——金额计算的四个陷阱与正确姿势(banking 20 题的 API 面)。

1. 陷阱一,new BigDecimal(double):0.1 的二进制表示带入——必须字符串构造或 valueOf。陷阱二,除法不设 scale:1/3 无限小数——ArithmeticException("Non-terminating decimal expansion")——divide 必须带 scale+RoundingMode。
2. 陷阱三,equals 与 compareTo:1.0 equals 1.00 = false(scale 不同),compareTo=0——数值比较用 compareTo,混用即"看不见的重复"。陷阱四,setScale 的舍入模式遗漏:RoundingMode 必须显式(HALF_UP/银行家按业务,第 20 题banking 统一)。
3. 本机锚点(banking B1):double 累加 0.1×1000=99.9999999999986,BigDecimal 精确 100.0——BigDecimal 的价值在"精确的十进制语义",前提是避开四个陷阱。

## 参考分析

### 第二步扩展① 机制:scale、precision 与 RoundingMode

- scale=小数位数,precision=总有效位——multiply 的 scale=两操作数 scale 之和(0.01×0.01=0.0001)。
- add/subtract 的 scale=两操作数 scale 的最大值——金额累加的 scale 一致性靠这条规则,中间结果 scale 漂移时需统一 setScale。
- divide 默认"精确否则异常"。
- RoundingMode 八种(HALF_UP 四舍五入/HALF_EVEN 银家/UP/DOWN/CEILING/FLOOR/UNNECESSARY)——UNNECESSARY(不需要舍入时用,需要则抛异常=显式防错)。
- 金额的 scale 契约:入账 2 位(币种 scale,第 22 题汇率)、计息中间 10 位(第 20 题banking)——scale 策略全司统一(第 47 题)。

### 第二步扩展② 反例:四陷阱的事故形态

- 事故一,double 入参:new BigDecimal(0.1) 的脏精度传播到分录——金额与凭证差亿分之几(对账差异)。
- 事故二,除法异常:费率计算 1/3 未设 scale——线上 ArithmeticException(接口 500)。
- 事故三,equals 判等:1.0 与 1.00 判不等——去重失败/状态判断失效。
- 事故四,舍入遗漏:setScale(2) 无模式——编译可过但同类问题必现。
- 四条的正解:字符串构造+显式 scale/RoundingMode+compareTo 判等——BigDecimal 的使用规范进 checklist(第 24 题)。

### 第二步扩展③ 取舍:BigDecimal vs long 分

- BigDecimal:可读(scale/precision 语义)、任意精度、性能较慢(对象+分配)。
- long 分:最快、无精度陷阱(整数运算)、scale 语义手工维护(除法时分转元)。
- 选择:账务核心高频路径 long 分(第 20 题banking 的热点方案),配置/展示/低频 BigDecimal——两者并存时转换函数统一(分↔元),转换边界是精度事故的高发区。

## 案例

### 第三步发散·验证与推演 验证:四陷阱的断言组

- 验证:入参断言(new BigDecimal(0.1) 的实际值展示 vs valueOf)。
- 除法断言(无 scale 抛异常/带 scale 正常)。
- equals 断言(1.0 vs 1.00 的 equals false、compareTo 0)。
- 舍入断言(HALF_UP 与 HALF_EVEN 的 0.005 对照)——四组陷阱用例进金额工具类的单测(每陷阱一条,防回归)。

### 第三步发散·追问扩展 追问链:BigDecimal 三刀

- **Q1：stripTrailingZeros 的坑?**
  - 答：new BigDecimal("600.0").stripTrailingZeros() 的 toString=6E+2(科学计数法)——toPlainString(禁止科学计数法进展示,第 44 题)。
- **Q2：setScale vs rounding?**
  - 答：运算时的舍入(MathContext)与展示时(setScale)分离——计算链的中间精度策略(第 20 题banking 三段控制)。
- **Q3：BigDecimal 的线程安全?**
  - 答：不可变(线程安全,第 8 题)——共享常量(BD_ZERO)可复用——不可变性让金额对象可放心进并发容器(第 20 题 distributed 值不可变替换)。

## 总结点

1. 字符串构造,除法必设 scale
2. 判等用 compareTo,展示禁科学计数
3. 中间高精度,最终一次舍入
