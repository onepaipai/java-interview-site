<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银事务沙盘:RR 隔离级别下 SELECT FOR UPDATE 对范围查询加 next-key 锁(记录锁+间隙锁)——防止幻读(其他事务插入范围内新行);RC 下无间隙锁但有幻读。database-basics 22 题的完整版。

1. 三种锁:记录锁(Record Lock,锁单条索引记录)、间隙锁(Gap Lock,锁索引记录之间的间隙——防插入,不锁记录本身)、临键锁(Next-Key Lock=记录锁+间隙锁,左开右闭区间)——RR 下默认 next-key;RC 下只有记录锁(无间隙锁→有幻读)。
2. 幻读解决:RR 快照读靠 MVCC(Read View 一次建立);当前读(SELECT FOR UPDATE/UPDATE)靠 next-key 锁(间隙锁防插入)——两种读不同机制(database-basics 17 题);写偏差 RR 仍可能(第 25 题 database-advanced)。
3. 唯一索引的退化:等值命中唯一索引已有记录→退化为纯记录锁(不需要间隙锁——记录存在,无间隙可插入);等值未命中→间隙锁(防止插入相同值)——database-basics 22 题的区间形状与退化规则。

## 参考分析

### 机制:间隙锁的"防插入"语义

间隙锁锁的不是记录而是"间隙"(索引中相邻记录之间的空隙)——防止其他事务在间隙中插入新行(防幻读);间隙锁之间不冲突(两个事务可同时持有同一间隙的间隙锁——都只防插入不防读取);间隙锁与插入意向锁冲突(插入意向锁等待间隙锁释放)。

### 反例:间隙锁的两种事故

事故一:不必要的间隙锁——RC 级别够用的场景用 RR→间隙锁增加死锁风险与锁范围;修复=按业务一致性需求选隔离级别(第 103 题转账隔离)。事故二:间隙锁导致的死锁——两个事务都持间隙锁→都尝试插入→互相等待(间隙锁不冲突但插入意向锁冲突)→死锁;修复=统一插入顺序或改 RC。

### 取舍:RR vs RC 的选择

RR:间隙锁防幻读+一致性读(快照稳定)——但锁范围大(间隙锁)+死锁风险高;RC:无间隙锁(锁范围小,并发好)+有幻读——大多数互联网公司用 RC(阿里规范);金融核心用 RR(一致性优先,第 103 题)——选择=一致性要求vs并发吞吐的权衡。

## 案例

### 验证:间隙锁的走查核对

验证:database-basics 22 题——键 10/20/30,RR 下 FOR UPDATE 锁定范围;另一连接尝试插入 15(阻塞)/25(阻塞)/35(取决于边界);RC 下同样操作(不阻塞——无间隙锁);SHOW ENGINE INNODB STATUS 查看 LOCK WAIT 结构;performance_schema.data_locks 查看锁详情。验证:锁范围断言与幻读行为断言可程序化(MySQL 实测)。

### 追问链:锁三刀

一刀:"next-key 的区间怎么定?"——(负无穷,10],(10,20],(20,30],(30,+无穷)——"记录及其前方间隙"合为一体;等值命中的退化规则(唯一命中→记录锁;未命中→间隙锁;普通索引→next-key+下一区间间隙,第 22 题 database-basics)。二刀:"插入意向锁?"——INSERT 前获取的间隙锁类型(与间隙锁冲突→等待);多个插入意向锁之间不冲突(同一间隙可多事务等待插入)。三刀:"锁的监控?"——performance_schema.data_locks/data_lock_waits(当前锁与等待)+SHOW ENGINE INNODB STATUS(LATEST DETECTED DEADLOCK,第 101 题数据库死锁排查)。

## 总结点

1. 记录锁+间隙锁=next-key(左开右闭)
2. RR 快照读 MVCC,当前读 next-key
3. RC 无间隙锁,有幻读但并发好
