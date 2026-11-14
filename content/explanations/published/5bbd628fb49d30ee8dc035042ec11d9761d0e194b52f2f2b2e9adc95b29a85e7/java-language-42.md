<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/text/BreakIterator.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银表单沙盘:昵称限制"10 个字符"——String.length() 返回 char 数(UTF-16 码元)——emoji(👨‍👩‍👧‍👦)length=11(码元)但用户看到 1 个字符——用户可见字符数用 codePointCount 或 BreakIterator(字素簇)。

1. 三层计数:String.length()=UTF-16 码元数(surrogate pair 占 2)、codePointCount=Unicode 码点数(emoji 家庭 7 个码点)、字素簇(BreakIterator/grapheme)=用户可见字符(emoji 家庭=1 个字素)——三层递进,用户感知=最内层。
2. 本机实验(J2):emoji 👨‍👩‍👧‍👦 length=11(码元)、codePointCount=7(码点)、用户看到 1 个——三层的差距=校验的精度差;é 的两种编码(composed 1 码元/decomposed 2 码元)——规范化(NFC)的必要性。
3. 校验与存储:长度校验按字素簇(用户预期)或码点(存储精度)——按业务定义(表单的"10 字符"是什么口径)——口径显式化(第 48 题distributed 口径)。

## 参考分析

### 机制:码元、码点与字素簇

码元(char):UTF-16 的编码单元(16 位)——BMP 字符 1 码元、增补字符(emoji)2 码元(surrogate pair)。码点(codePoint):Unicode 字符的编号(21 位)——1 码点可 1 或 2 码元。字素簇(grapheme):用户可见的字符(1 个 emoji=多个码点[ZWJ 连接])——BreakIterator.getCharacterInstance 的边界。规范化:NFC(NFD 的组合序列→组合形式)——é 的两种编码统一(composed.equals(decomposed)=false → Normalizer.normalize 后相等)。

### 反例:计数口径的三种事故

事故一,长度截断断 emoji:substring(0, 10) 截断在 surrogate pair 中间——无效字符(存储/展示异常)。事故二,计数控件:输入框 maxlength=10(HTML 按 codePoint?浏览器差异)——后端按码元校验——前后端口径不一致(合法输入被拒)。事故三,去重失败:é 的两种编码(composed/decomposed)被当两个不同用户——规范化缺失(第 33 题 distributed 键规范化)。三条的正解:口径显式(码元/码点/字素簇)+规范化(NFC)+截断的边界安全(codePoint 对齐)。

### 取舍:口径的选择与统一

口径选择:存储限制(codePoint 或字节数[UTF-8 字节数——DB 的 varchar(n) 是字符数但 n 的定义随 DB])、用户限制(字素簇)、传输限制(码元/字节)——每层口径不同,转换函数统一。前后端一致:前端的字符计数(JS 的 length=UTF-16 码元,与 Java 一致)与后端的口径对齐(第 27 题 distributed 前后端一致)。

## 案例

### 验证:计数控件的断言组

验证:三层计数断言(J2 实测:emoji 的 length/codePointCount/字素簇计数对照);规范化断言(NFC 后 composed.equals(decomposed)=true);截断安全断言(codePoint 对齐的截断不产生无效字符)——三组固化计数口径;前后端口径一致的联调用例。

### 追问链:字符计数三刀

一刀:"String 的 UTF-16?"——Java String 内部 UTF-16(JDK 9 紧凑字符串 Latin1[ASCII 内容])——Latin1 内容的 length=字节数=码元数(一致);非 Latin1(中文/emoji)UTF-16(紧凑失效)——紧凑字符串的条件(第 32 题)。二刀:"DB 的字符计数?"——MySQL varchar(n) 的 n=字符数(UTF-8 下按字符)vs 字节数——DB 的口径与 Java 的口径对齐(第 33 题)。三刀:"字素簇的库?"——BreakIterator(标准库)——字素簇的迭代(用户可见字符的遍历)——BreakIterator 的性能(文本分割的成本)——大量文本的字素簇操作成本评估。

## 总结点

1. 码元码点字素簇,三层计数三口径
2. emoji 是多码点单字素
3. NFC 规范化,前后端口径一致
