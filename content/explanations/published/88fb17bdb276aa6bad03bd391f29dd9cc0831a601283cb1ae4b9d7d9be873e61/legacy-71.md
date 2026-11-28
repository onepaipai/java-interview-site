<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银转账沙盘:A→B 与 B→A 并发转账,两个事务分别先锁 A 后锁 B 与先锁 B 后锁 A——互相等待死锁;四条件(互斥/持有并等待/不可剥夺/循环等待)破坏任意一条即可避免。

1. 四条件:互斥(资源不能共享)+持有并等待(持有 A 等 B)+不可剥夺(锁不能被第三方强制释放)+循环等待(A 等 B,B 等 A)——破坏任意一条:一次性申请(破坏持有并等待)/tryLock 超时(破坏不可剥夺)/固定加锁顺序(破坏循环等待)。
2. 排查:线程转储(jstack/jcmd Thread.print)找"Found one Java-level deadlock"段——BLOCKED 线程的 waiting to lock 与持有者的 locked 串成环;Arthas thread --state BLOCKED 过滤+thread -b 定位阻塞源头(并发基础 32 题排查工具链)。
3. 避免:固定加锁顺序(按账户 ID 排序,lockInOrder 工具方法)+tryLock 带超时(拿不到就退回)+缩小锁范围(锁外不调远程,短事务)+数据库死锁(InnoDB wait-for 图自动回滚一方,重试+幂等键)。

## 参考分析

### 第二步扩展① 机制:死锁的成因=加锁顺序不一致

- 转账场景:事务 1 先锁 A 后锁 B,事务 2 先锁 B 后锁 A→两事务互相等待。
- 修复=所有事务按相同顺序加锁(按 ID 排序)——顺序一致则不可能成环(数学证明:有向图无环)。
- 数据库死锁=InnoDB wait-for 图检测自动回滚一方(兜底不是设计,banking 7 题锁序)。

### 第二步扩展② 反例:死锁排查的两种事故

- 事故一:看到 BLOCKED 就报死锁——可能只是长事务阻塞(非死锁,可自行解除)。
- 修复=看 jstack 是否有"Found one Java-level deadlock"段。
- 事故二:死锁后盲目重启——重启清空所有事务(排队任务丢失,第 9 题)。
- 修复=先止血(重启)后根因(锁序审计)。

### 第二步扩展③ 取舍:锁顺序 vs tryLock 的选择

- 固定顺序:零运行时开销,默认选择(维护顺序规则)。
- tryLock:灵活(不阻塞)但引入重试循环与退避策略。
- 一把大锁(全局锁):消灭死锁但并发归零(低频管理操作)。
- 数据库死锁:InnoDB 自动检测+回滚+应用重试(banking 7 题)。

## 案例

### 第三步发散·验证与推演 验证:死锁的走查核对

- 验证:死锁复现(两个线程 transfer(A,B) 与 transfer(B,A) 各 sleep 10ms→jstack 报死锁)。
- 修复验证(lockInOrder 排序后同脚本零死锁)。
- Arthas 验证(thread --state BLOCKED 过滤+thread -b 定位)。
- 数据库死锁(InnoDB 死锁日志的等待环解读,banking 7 题锁序)。
- 验证:复现与修复的断言可程序化(并发测试+死锁检测)。

### 第三步发散·发散要点 追问链:死锁三刀

- **追问①·"活锁与死锁的区别?"——死锁**：停着不动(CPU 空闲);活锁=忙着让路(CPU 满转,重试-回滚循环,并发基础 33 题)——活锁靠随机退避打破对称(并发基础 33 题)
- **追问②**："数据库死锁与 JVM 死锁的排查?"——JVM:jstack/Arthas;DB:SHOW ENGINE INNODB STATUS(LATEST DETECTED DEADLOCK 段,第 101 题数据库死锁)——两套体系按锁层次分别查
- **追问③**："锁顺序的"序"用什么定?"——稳定且全局一致的字段(数据库主键/唯一 ID);任何随时间变化的序(哈希遍历/列表下标)不同时刻不同顺序=等于没定(banking 7 题锁序)

## 总结点

1. 四条件破坏任意一条即避免
2. jstack 找死锁段,0x 地址串环
3. 固定加锁顺序写进代码,不靠约定
