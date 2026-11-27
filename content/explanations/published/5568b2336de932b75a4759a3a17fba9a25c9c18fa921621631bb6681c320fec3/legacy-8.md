<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/reflect/Type.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:List<String> 与 List<Integer> 运行期同一 Class(擦除)——泛型是编译期护栏,运行期全部擦除为 Object;擦除的限制与护栏见 java-language/4 题深入版。

1. 泛型的编译期作用:类型检查(类型不匹配编译错)+自动桥方法+类型推断(diamond);运行期:擦除为上限(raw List/Object)——instanceof 泛型不可、new T[] 不可、反射可绕过(J2 实验)。
2. 擦除的原因:向后兼容(JDK 5 引入泛型时不破坏旧代码)——泛型信息仅保留在 Signature 属性(反射可读 getGenericSuperclass)与编译期检查。
3. 运行期类型信息的替代:显式 Class 参数、TypeToken(匿名子类保留泛型签名)、Collections.checkedList(运行期校验,爆炸点前移)——详见 java-language/4 题深入版。

## 参考分析

### 第二步扩展① 机制:桥方法与类型安全的实现

- 编译器插入 checkcast(取值时强转)+桥方法(泛型实现 Comparable<T> 的 compareTo(Object) 桥,J2b javap 实测 ACC_BRIDGE+ACC_SYNTHETIC)——擦除后通过桥方法维持多态分派。
- 泛型的类型安全完全依赖编译期检查,运行期无保护。

### 第二步扩展② 反例:泛型擦除的两种事故

- 事故一:instanceof 泛型——if(obj instanceof List<String>)编译不过。
- 修复=instanceof List(裸)+元素逐个判。
- 事故二:反射塞 Integer 进 List<String>——编译期无告警,取值时 ClassCastException(爆炸点远离塞入点)。
- 修复=Collections.checkedList 或边界校验。

### 第二步扩展③ 取舍:泛型的适用与不适用

- 适用:集合类型安全/方法参数与返回值的类型约束/自定义泛型类(缓存<K,V>/结果包装)。
- 不适用:运行期需要类型信息的场景(序列化→用 TypeToken)、泛型数组(new T[] 不可)——泛型是"编译期的类型安全+运行期的类型擦除",理解这个本质才能正确使用。

## 案例

### 第三步发散·验证与推演 验证:泛型擦除的走查核对

- 验证:J2 实验——Class 同一断言(两泛型列表 getClass 相同)。
- 反射绕过断言(塞 Integer 成功+取值 CCE)。
- checkedList 断言(塞入即抛——爆炸点前移)。
- J2b javap 实测(桥方法 ACC_BRIDGE)。
- 验证:四组断言固化泛型擦除语义(本机 J2/J2b 实验)。

### 第三步发散·追问扩展 追问链:泛型三刀

- **Q1：泛型与重载冲突?**
  - 答：两个方法仅泛型参数不同(擦除后同签名)→编译错("clashes with erasure");重载设计避开擦除冲突。
- **Q2：super 与 extends 通配符?**
  - 答：? extends T(读取,协变)与 ? super T(写入,逆变)——PECS 原则(Producer Extends Consumer Super);通配符使集合"只读"或"只写"。
- **Q3：泛型的性能?**
  - 答：无运行时开销(擦除后与非泛型代码相同);但装箱(泛型不支持基本类型→List<Integer> 每元素装箱)——高频数值计算用原始类型数组。

## 总结点

1. 泛型=编译期护栏,运行期全擦除
2. 反射绕过→取值 CCE(爆炸点远离)
3. 运行期类型信息用 Class 参数或 TypeToken
