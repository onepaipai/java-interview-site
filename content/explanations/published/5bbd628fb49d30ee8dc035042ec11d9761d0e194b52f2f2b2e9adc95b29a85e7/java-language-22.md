<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/io/ObjectInputStream.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:接口接收 Java 序列化对象流——反序列化执行 readObject(可重写/触发类路径 gadget)——反序列化漏洞(经典 RCE 攻击面)。序列化的安全定位:仅限内部可信边界(内部 RPC 的遗留),不可信输入用 JSON/proto+校验。

1. 漏洞的本质:readObject 在反序列化时执行代码(ObjectInputStream 的 gadget 链:类路径上任何可利用类的 readObject/readResolve)——攻击者构造序列化流触发 gadget(无需源码漏洞,类路径即攻击面)。
2. JDK 的防御演进:反序列化过滤器(ObjectInputFilter,JEP 290[9]/283[18]——白名单类+深度/引用限制)——过滤器是缓解不是根治(白名单维护负担)。ysoserial 的攻击面:gadget 链库(攻击者的武器化)——序列化的攻击面是"类路径即攻击面"。
3. 正解:不可信输入用数据格式(JSON/proto——无代码执行语义)+schema 校验(第 25 题);Java 序列化仅限内部可信边界(遗留内部协议)+过滤器+尽快迁移(第 14 题契约演进)。

## 参考分析

### 机制:gadget 链与过滤器

gadget 链:类路径上的一组类(其 readObject/readResolve/等回调可被串成任意代码执行)——攻击者无需目标代码漏洞,组合 JDK/库的类即可(ObjectInputStream 的反序列化=调用 readObject=潜在代码执行)。过滤器:ObjectInputFilter(白名单类模式/深度限制/引用数限制)——JEP 290(9)的缓解;配置的粒度(全局/流级)与维护成本(新增类要更新白名单)。

### 反例:序列化的三种事故

事故一,回调接口收序列化:渠道回调收 Java 序列化流(历史遗留)——反序列化 RCE(经典攻击)。事故二,缓存序列化:Redis 存 Java 序列化对象(JdkSerializer)——缓存数据被篡改(攻击面进缓存)。事故三,gadget 依赖:引入带 gadget 的库(commons-collections 旧版)——攻击面扩大(供应链,第 33 题)。三条的正解:不可信输入换数据格式+过滤兜底+依赖治理。

### 取舍:序列化的替代与迁移

替代:JSON(Jackson——校验+schema)+proto(二进制+schema 强制)——数据格式的选择(第 14 题)。迁移路径:内部序列化协议的双格式过渡(新格式并存+旧格式 deprecated,第 41 题);过滤器先行(立即缓解)+格式迁移(根治)。序列化的遗留价值:内部 RPC 的性能(Java 原生)与复杂对象图——遗留兼容的短期合理性+长期迁移的必然性。

## 案例

### 验证:防御的断言组

验证:过滤器断言(非白名单类的反序列化被拒——ObjectInputFilter 实测);gadget 演练断言(ysoserial 类 payload 被过滤器拦截——攻击面验证);扫描断言(代码中 ObjectInputStream 的使用清单——全部标注可信边界)——三组让序列化防御可验证;ObjectInputStream 的引入审批(第 33 题供应链纪律)

### 追问链:序列化安全三刀

一刀:"record 的序列化?"——record 反序列化走构造器(校验不可绕过,spring-advanced 9 题)——record 是序列化安全的结构改善。二刀:"Kryo/其他库?"——Kryo/Hessian 同有反序列化风险(各自的类注册机制缓解)——任何"反序列化执行代码"的格式都有攻击面——数据格式(JSON/proto)无执行语义是根本解。三刀:"序列化的密钥?"——序列化流的加密(传输保护)不影响反序列化漏洞(解密后仍执行)——加密≠安全(混淆了传输保护与输入安全)。

## 总结点

1. 类路径即攻击面,过滤是缓解
2. 不可信输入换数据格式
3. record 反序列化走构造器
