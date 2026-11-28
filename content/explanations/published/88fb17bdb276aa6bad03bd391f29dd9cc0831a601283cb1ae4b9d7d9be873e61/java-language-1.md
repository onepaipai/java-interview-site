<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账户沙盘:Account 重写 equals 不重写 hashCode——HashSet<Account> 里同一账户出现两次(哈希不同桶),HashMap 查不到已存对象。用 collections 8 题的判等分野实验说明契约的三条规则与领域建模的落点。

1. 契约三规则:equals 相等则 hashCode 必相等(否则哈希容器丢元素);hashCode 相等不要求 equals 相等(允许碰撞);equals 的字段集⊆hashCode 的字段集(一致性,第 8 题collections compare 同源)。
2. 实测锚点(collections C1):可变 key 修改后 get=null、containsKey=false——hashCode 随状态变化的键在容器中"消失";equals 与 hashCode 用不同字段集=TreeSet/HashMap 判等分野的隐患(collections 8 题)。
3. 领域落点:值对象(账户 ID+类型)用 record(自动 equals/hashCode/toString,字段集天然一致);实体(有生命周期)按业务键 equals(ID)+hashCode(ID)——两类对象的判等策略显式分开。

## 参考分析

### 第二步扩展① 机制:哈希容器的判等链

- HashMap 定位:hash(键)→桶→equals 比对——hashCode 决定去哪个桶,equals 决定是不是同一个——两步任一不一致即"找不到"。
- 契约违约的三种表现:重写 equals 不重写 hashCode(同对象两桶,Set 出现"重复")。
- hashCode 用可变字段(键改状态后消失,C1 实验)。
- equals 用可变字段(容器外的相等判断漂移)。
- record 的价值:编译器生成三件套且字段集一致——值对象的契约免维护。

### 第二步扩展② 反例:契约违约的三种事故

- 事故一,Set 重复:同账户两次 add 都成功(哈希不同)——去重失效(对账口径乱)。
- 事故二,键消失:可变键改字段后 get=null(C1 实测:containsKey=false)——缓存丢失(第 47 题 banking 缓存归属同题)。
- 事故三,跨容器不一致:HashMap 两份、TreeSet 一份(collections 8 题:compare/equals 分野)——同一数据不同容器结果不同。
- 三条的正解:值对象 record 化+可变对象按业务键判等+键不可变化。

### 第二步扩展③ 取舍:实体与值对象的判等策略

- 值对象(record):全字段 equals——内容相同即相等(金额+币种的 Money)。
- 实体(ID 实体):按业务键 equals(ID 相等即同一账户——生命周期内状态可变,ID 不变)——实体的 hashCode 只用 ID(稳定)。
- JPA 实体的特殊面:ID 未生成时(新实体)equals 退化为引用相等——混合判等的边界要显式(状态机判等)。

## 案例

### 第三步发散·验证与推演 验证:契约的断言组

- 验证:三规则断言(equals→hashCode 相等。
- hashCode 字段集⊆equals。
- record 三件套一致——属性测试风格随机对象对)。
- 容器行为断言(可变键消失[C1 实测]、record 键稳定)。
- 实体/值对象双策略的对照用例——三组进领域模型的单测模板。

### 第三步发散·追问扩展 追问链:契约三刀

- **Q1：hashCode 能缓存吗?**
  - 答：String 缓存 hash(本机 J1:1ns,不可变前提)——可变对象缓存 hash=修改后哈希不更新(违约)——不可变才有缓存资格。
- **Q2：equals 的对称/传递违约?**
  - 答：equals 与 compareTo/继承的对称问题(父类 equals 与子类——getClass vs instanceof 之争)——值对象用 record/getClass 终结。
- **Q3：第三方键类?**
  - 答：用第三方类做键(不控 equals/hashCode)——包装(自己的键类包一层)或文档依赖(信任第三方契约)——键的契约责任要明确归属。

## 总结点

1. equals 相等则哈希必相等
2. 可变键会消失,record 免维护
3. 实体按 ID,值对象按内容
