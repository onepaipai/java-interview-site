<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashSet.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银去重沙盘:百万流水号去重——HashSet 底层就是 HashMap(add=map.put(key, PRESENT))——不重复靠 hashCode+equals 契约,两个环节缺一即漏。

1. HashSet 包装 HashMap:private transient HashMap<E,Object> map+静态 PRESENT 占位对象——add(e) 返回 map.put(e, PRESENT)==null(返回 null=新增,非 null=已存在)——去重逻辑全部复用 HashMap 的 key 判重。
2. 判重两环节:先 hashCode 定位桶(快),桶内 equals 精确比较——hashCode 相等只是必要条件,equals 相等才真重复;两对象 equals 相等必须 hashCode 相等(契约,反之不要求)。
3. 违反契约的后果:只重写 equals 不重写 hashCode——两个业务相等的对象散到不同桶→Set 出现重复;只重写 hashCode 不重写 equals——hashCode 相同但 equals 不同→都进 Set(业务重复)。hashCode 稳定性:存入后修改参与 hash 的字段→对象成孤儿(删不掉找不到)。

## 参考分析

### 第二步扩展① 机制:为什么两环节缺一即漏

- HashMap 判重=先按 hashCode 找桶(等价于按桶分组),再桶内逐个 equals——hashCode 不同=不同桶,equals 根本没机会执行。
- hashCode 相同但 equals 不同=同桶不同条目(碰撞,合法)。
- 类比:邮编(hashCode)分拣+门牌(equals)精确投递——邮编错了信永远进错小区。

### 第二步扩展② 反例:去重失效的两种事故

- 事故一:自定义类只重写 equals——HashSet 出现业务重复(如两个金额相同但实例不同的交易对象都入 Set)。
- 修复=Lombok @EqualsAndHashCode 或按字段重写。
- 事故二:可变 key 入 Set 后改字段——contains/remove 失效。
- 修复=不可变 key 或不改参与 hash 的字段。

### 第二步扩展③ 取舍:去重容器的选型

- HashSet(无序 O(1))/LinkedHashSet(保插入序)/TreeSet(排序 O(log n),compare 判重不走 hashCode——Comparator 一致性同样要求)/并发 CopyOnWriteArraySet(读多写少)。
- 百万级去重内存敏感→布隆过滤器(允许误判)。

## 案例

### 第三步发散·验证与推演 验证:去重契约的实测走查

- 验证:契约断言(equals 相等→hashCode 必相等——反射构造只重写一个的反例,观察 Set 重复/孤儿)。
- remove 孤儿断言(入 Set 后改字段→remove 返回 false)。
- PRESENT 断言(反射读 map 确认占位对象)——三组固化契约语义,本机可复跑。
- 预期:契约破坏立即表现为重复或孤儿。

### 第三步发散·发散要点 追问链:Set 三刀

- **追问①·TreeSet 判重**：compare/compareTo==0(不走 hashCode/equals)——排序字段与相等字段要一致
- **追问②·HashSet 如何判断元素存在**：contains 走同 put 的两环节(O(1) 均摊)
- **追问③·LinkedHashSet**：LHM 的 accessOrder=false 插入序(区别于 LRU 访问序,legacy/111 同源)

## 总结点

1. HashSet=HashMap 的 key 集合视图
2. hashCode 定位+equals 判等,缺一即漏
3. 可变 key 入集合=孤儿风险
