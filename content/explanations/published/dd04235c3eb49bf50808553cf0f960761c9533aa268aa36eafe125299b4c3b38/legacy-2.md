<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银用户沙盘:User 对象放入 HashSet,两个"相同"的用户(同 ID)被当作不同元素——equals 重写了但 hashCode 没重写,哈希容器行为异常。

1. == 比较引用(同一对象才 true);equals 比较逻辑相等(需重写,默认===);hashCode 返回对象哈希值(哈希容器定位用)——三者关系:重写 equals 必须同时重写 hashCode,保证"equals 相等→hashCode 相等"。
2. hashCode 与 equals 的契约:hashCode 相等不要求 equals 相等(哈希碰撞);equals 相等必须 hashCode 相等(否则哈希容器行为异常)——违反契约的后果:HashSet 中"相同"对象重复出现,HashMap get 返回 null(第 2 题 collections)。
3. equals 的实现规范:自反/对称/传递/一致/null 返回 false——手写要点:先比引用(优化),再比类型(instanceof 或 getClass),再比关键字段(用 Objects.equals 和 Arrays.equals 处理数组和 null)。

## 参考分析

### 第二步扩展① 机制:哈希容器为什么依赖 hashCode 契约

- HashMap 的查找流程:key.hashCode()→定位桶→桶内遍历用 equals 匹配——如果 hashCode 不一致,两个"equals 相等"的对象可能被分到不同桶,遍历时找不到(第 2 题 collections 的详细机制)。
- hashCode 是"定位",equals 是"确认"——定位对了确认才有效。
- 定位错了永远找不到。

### 第二步扩展② 反例:违反契约的两种事故

- 事故一:只重写 equals 不重写 hashCode——HashSet.add(两个"相同"对象)→集合中出现两个元素(去重失败)。
- 修复=同时重写 hashCode(用 Objects.hash(关键字段))。
- 事故二:hashCode 用可变字段——对象放入 HashMap 后修改了参与 hashCode 的字段→get 返回 null(对象还在但定位不到)。
- 修复=hashCode 用不可变字段或 key 用不可变对象(第 20 题 collections 值安全)。

### 第二步扩展③ 取舍:手写 equals vs Lombok/Record

- 手写:完全可控但要覆盖所有规范(自反/对称/传递/null/class)。
- Lombok @EqualsAndHashCode:自动生成(注意 callSuper 参数——继承时要调 super.equals)。
- Record:自动生成(不可变+自动 equals/hashCode)——推荐 Record(第 1 题 java-language)或 Lombok(存量项目)。
- 手写仅在学习时用。

## 案例

### 第三步发散·验证与推演 验证:equals/hashCode 契约的断言组

- 验证:equals 对称断言(a.equals(b)==b.equals(a))。
- hashCode 一致断言(a.equals(b)→a.hashCode()==b.hashCode())。
- HashSet 去重断言(两个 equals 相等的对象 add 后 size=1)。
- HashMap get 断言(重写 hashCode 后 get 可找到)——四组固化契约(本机 C 系列实验:可变 key 的 get=null 事故)。

### 第三步发散·追问扩展 追问链:equals 三刀

- **Q1：equals 与 Comparable?**
  - 答：equals 比"是不是同一值",compareTo 比"排序大小"——两者语义不同(Person 可以 equals 判断 ID 相同,compareTo 按 age 排序);compareTo 为 0 不要求 equals 为 true(但建议一致,TreeSet 用 compareTo 去重)。
- **Q2：instanceof vs getClass?**
  - 答：instanceof 允许子类相等(父类.equals(子类)可能 true);getClass 严格类型匹配(不同类不相等)——Effective Java 推荐 getClass(严格),但某些框架(如 JPA 实体)用 instanceof(代理兼容)。
- **Q3：hashCode 的实现?**
  - 答：Objects.hash(field1,field2,...)(自动处理 null 和数组)或手写(31*result+field.hashCode())——31 是奇素数(乘法溢出分布均匀),不可用 2 的幂(等价于位移,低位丢失)。

## 总结点

1. equals 重写必须同时重写 hashCode
2. 哈希容器:hashCode 定位,equals 确认
3. 优先 Record 或 Lombok,少手写
