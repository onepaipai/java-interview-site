<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银应用沙盘:SpringBootApplication 在 com.bank.app 组件扫描根 com.bank.app——启动类移到 com.bank 扫描范围扩大。启动类位置即扫描根。

1. 扫描根的机制 SpringBootApplication 默认扫描启动类所在包及子包——启动类位置等于扫描根隐式约定。位置变了扫描范围变。
2. 事故形态启动类在 com.bank.app 扫描 com.bank.app.*移到 com.bank 扫描 com.bank.*含无关 bean 扫描范围隐式扩大。修法 scanBasePackages 显式消除隐式或启动类位置保持稳定。
3. 与多模块的关系多模块的 bean 分布在不同包扫描根必须覆盖公共祖先 scanBasePackages 显式列举精确控制。

## 参考分析

### 机制:扫描根的隐式约定

默认扫描 SpringBootApplication 的 scanBasePackages 默认等于启动类所在包。启动类在 com.bank.app 扫描 com.bank.app.*隐式约定位置即范围。移动启动类从 com.bank.app 移到 com.bank扫描范围从 app.* 扩大到 bank.*隐式扩大。显式 scanBasePackages 消除隐式依赖。

### 反例:扫描根变更的事故

事故启动类从 com.bank.app 移到 com.bank重构包结构扫描范围从 app.* 扩大到 bank.*含 legacy 子包legacy 的旧 bean 被扫描注册与新 bean 冲突。修复 scanBasePackages 显式扫描范围不因启动类位置变化。

### 取舍:隐式与显式的取舍

隐式默认简单但脆弱位置变化即扫描变化。显式 scanBasePackages 多一行配置但稳定位置无关。多模块场景必须显式多模块的公共祖先范围不可控显式化进规范。

## 案例

### 验证:扫描根的断言组

验证:根变更断言(启动类移动后扫描范围变化 bean 清单对比);显式断言(scanBasePackages 显式后启动类位置无关移动启动类不改变扫描);范围断言(扫描范围外 bean 不被发现)——三组固化扫描根的隐式约定。

### 追问链:扫描根三刀

一刀:扫描的性能扫描范围大等于类路径扫描慢启动时间。二刀:扫描与模块化模块化单体的扫描范围全部模块单一 Spring 上下文 vs 模块独立上下文。三刀:组件发现的其他方式 Import 显式导入配置类 ImportResource XML 不依赖扫描根的显式导入。

## 总结点

1. 启动类位置等于扫描根隐式
2. scanBasePackages 显式化消除隐式
3. 扫描范围影响启动时间
