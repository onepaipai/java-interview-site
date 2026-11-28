<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账务沙盘:外层事务里写审计日志用 REQUIRES_NEW,高峰期连接池耗尽,外层全在等日志事务的连接。用连接计数实验说明两种传播的连接占用模型与死锁风险。

1. REQUIRED 参与外层:整个事务共用一个连接;REQUIRES_NEW 挂起外层、新取一个连接——同一时刻占用两个连接。
2. 实测:计数 DataSource 统计事务全程新建连接,REQUIRED=1(仅外层),REQUIRES_NEW=2(外层加内层各一)。
3. 风险:外层持有连接 A 等内层,内层用连接 B;若内层又要访问外层锁住的行,或池被 REQUIRES_NEW 大量消耗,即连接互等死锁与池耗尽。

## 参考分析

### 第二步扩展① 机制:挂起与恢复的资源账本

- REQUIRES_NEW 的执行序列:外层已绑定连接 A。
- 内层开始时事务管理器把 A 的 ConnectionHolder 从当前线程的 TransactionSynchronizationManager(ThreadLocal)解绑——挂起=解绑 ThreadLocal 资源,连接本身仍被外层事务持有、不归还池。
- 随后从池里取新连接 B 绑定、内层独立提交/回滚、解绑 B、恢复时重新绑定 A。
- 账本:同一时刻两连接,外层连接的持有时间被内层时长放大。
- REQUIRED:内层直接用 A,一切共享。
- 池容量视角:N 个并发请求各占 1 连接再各借 1 个给 REQUIRES_NEW,池需求翻倍。
- 池小于 2N 即排队。

### 第二步扩展② 实证:计数 DataSource 的连接账本

- 本机实验(Spring 6.2.19 + H2):DelegatingDataSource 覆写 getConnection 统计新建连接数,外层 REQUIRED 里分别用两种传播执行内层:
```
Q2 REQUIRED 内层新建连接=1 REQUIRES_NEW 内层新建连接=2
```
- 解读:REQUIRED 的 1 是外层自己的连接(内层复用)。
- REQUIRES_NEW 的 2 = 外层连接加内层新连接——差值即"多占的那一个"。
- 若外层先锁了一行、内层(REQUIRES_NEW)再更新同一行,就是经典的自己等自己死锁。
- 验证:同程序重跑一致。

### 第二步扩展③ 取舍:什么时候真的需要 REQUIRES_NEW

- 审计/通知类"无论主事务成败都要留痕"——REQUIRES_NEW 合理,但要控制频率与池余量。
- 为了避免"部分提交"而用 REQUIRES_NEW 拆步骤——多数是错误设计(要么用 NESTED 保存点,第 3 题。
- 要么重新划事务边界)。
- 降级方案:审计走事务提交后异步(@TransactionalEventListener AFTER_COMMIT 加独立短事务,第 9/11 题),主事务连接即还。
- 评审问句:这个 REQUIRES_NEW 挂起期间,主事务的锁与连接要被放大多久?

## 案例

### 第三步发散·验证与推演 验证:用 DelegatingDataSource 覆写 getC

- 验证:用 DelegatingDataSource 覆写 getConnection 计数(本实验手段),同一负载下分别跑 REQUIRED 与 REQUIRES_NEW,事务全程新建连接数 1 对 2 即证据。
- 再压并发使池逼近上限,复现等待线程出现。

### 第三步发散·追问扩展 追问链:连接占用三刀

- **Q1：池多大才安全?**
  - 答：并发请求数乘最大嵌套深度加缓冲;监控池等待线程数,出现等待即接近耗尽。
- **Q2：REQUIRES_NEW 内层访问外层未提交数据会怎样?**
  - 答：另一个连接看不到未提交数据(隔离级别使然),读到旧值或锁等待——逻辑上"看不到自己刚写的数"是 REQUIRES_NEW 的常见坑。
- **Q3：NESTED 与 REQUIRES_NEW 的连接占用?**
  - 答：NESTED 用保存点,同一个连接,不额外占池;这是它优于 REQUIRES_NEW 的资源面(语义差异见第 3 题)。

## 总结点

1. REQUIRED 共一池,REQUIRES_NEW 借两池
2. 挂起不释放,占用被放大
3. 审计走提交后,别挂主事务
