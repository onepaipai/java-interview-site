<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银转账沙盘:Controller 做业务逻辑(校验+规则+调渠道)、Service 只做透传、Repository 塞业务 SQL——三层职责混乱。正确分工:Controller=协议适配(参数/响应)、Service=业务编排(规则+事务边界)、Repository=数据访问(持久化)。

1. Controller:HTTP 协议适配(参数绑定/校验注解/响应封装/状态码)——不含业务规则(业务下沉 Service);Service:业务编排(调用领域逻辑+事务边界+跨 Repository 协调)——不含 HTTP 语义;Repository:数据访问(CRUD/查询构造)——不含业务规则(只有数据操作)。
2. 依赖方向:Controller→Service→Repository(单向,第 2 题distributed 业务能力划分的层内结构);反向禁止(Repository 不调 Service)——A2 依赖度量守门(第 41 题)。
3. 事务边界:Service 方法=@Transactional 位置(第 12 题)——Controller 不开事务(HTTP 层无事务语义)、Repository 不开事务(被 Service 的事务覆盖)——事务在 Service 层统一。

## 参考分析

### 第二步扩展① 机制:三层的职责边界

- Controller=协议适配(参数响应),Service=业务编排(规则事务),Repository=数据访问(CRUD)——依赖方向单向。
- 校验:依赖箭头只允许自上而下,反向引用即边界破损信号,进评审清单。

### 第二步扩展② 反例:职责混乱的代价

- Controller 含业务规则(变更需改协议层)。
- Repository 含业务 SQL(变更需懂数据库)——职责越界=维护成本升。
- 修复:业务规则上移 Service,数据细节下沉 Repository,协议层只做翻译。

### 第二步扩展③ 取舍:层的粒度

- 薄 Controller(不超过 10 行)→厚 Service(业务编排)→薄 Repository(数据操作)——每层方法长度与职责匹配。
- 反例警示:Service 堆满转发样板或 Controller 直接调 Repository,都是粒度失衡信号。

## 案例

### 第三步发散·验证与推演 验证:三层分工的断言组

- 验证:依赖方向断言(ArchUnit:Controller 禁依赖 Repository。
- Repository 禁依赖 Service——反向拦截)。
- 职责断言(Controller 无业务规则、Service 无 HTTP 语义、Repository 无业务规则——扫描)。
- 事务断言(@Transactional 只在 Service 层)——三组固化三层纪律。

### 第三步发散·追问扩展 追问链:三层三刀

- **Q1：DTO vs Entity?**
  - 答：Controller 层用 DTO(对外契约)、Service 层用领域对象、Repository 层用 Entity——三层的对象模型分离(第 7 题 distributed 防腐)。
- **Q2：薄 Controller?**
  - 答：Controller 方法≤10 行(参数绑定→调 Service→返回)——厚的 Controller=业务泄漏到协议层。
- **Q3：Service 的事务边界?**
  - 答：Service 方法=事务边界(spring-advanced 12 题 TransactionTemplate)——事务边界在 Service 不在 Controller/Repository——事务与业务的层次一致。

## 总结点

1. Controller 协议,Service 业务,Repository 数据
2. 依赖单向,事务在 Service
3. DTO 分层,Entity 不出 Repository
