<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银日志沙盘:redo(InnoDB 崩溃恢复,物理日志,循环写)、undo(回滚+MVCC,逻辑日志)、binlog(Server 层,复制+时间点恢复)——两阶段提交(redo prepare→binlog→redo commit)保证 redo 与 binlog 一致。database-basics 28 题的完整版。

1. redo log:InnoDB 引擎层,物理日志(页的修改)——WAL(Write-Ahead Logging,先写日志再写数据页)保证持久性;循环写(ib_logfile0/1 固定大小,checkpoints 推进);崩溃恢复:重启后重放 redo(已提交未刷盘的恢复)。
2. undo log:InnoDB 引擎层,逻辑日志(反向操作)——事务回滚(撤销修改)+MVCC(历史版本链,第 19 题数据库);insert 的 undo=删除标记,update 的 undo=旧值;purge 线程清理(长事务阻止清理,第 20 题数据库)。
3. binlog:Server 层,逻辑日志(变更事件)——复制(主→从)+时间点恢复(PITR)+审计;三种格式:statement(SQL 语句)/row(行变更)/mixed(自动选择)——两阶段提交:redo prepare→写 binlog→redo commit(崩溃恢复按 redo 状态+binlog 完整性决定)。

## 参考分析

### 机制:两阶段提交的一致性保证

崩溃场景:redo prepare 后崩溃——如果 binlog 完整→提交(复制需要这条)→否则回滚——"redo 与 binlog 要么都写要么都不写"(一致性保证);如果只用 redo 不用两阶段:redo 提交但 binlog 缺失→从库缺数据(不一致)。类比快递:包裹打包(redo prepare)→快递单生成(binlog)→发货(redo commit)——缺快递单=收件方不知道收到了什么。

### 反例:日志的两种事故

事故一:innodb_flush_log_at_trx_commit=0——每秒刷盘(而非每事务)→断电丢 1 秒数据;修复=1(每事务刷盘)+sync_binlog=1(binlog 也刷盘)——性能与持久性的权衡(第 29 题数据库)。事故二:undo 长事务阻止清理——长事务持有旧 Read View→purge 无法清理历史版本→undo 膨胀;修复=监控长事务(information_schema.innodb_trx)+拆分长事务(第 20 题数据库)。

### 取舍:binlog 格式的选择

statement:日志量小但非确定性函数(NOW/UUID)主从不一致;row:日志量大但精确(行变更);mixed:自动选择(默认 statement,不安全时切 row)——金融场景推荐 row(精确+可审计)+binlog_row_image=FULL(全列)或 MINIMAL(变更列,省空间)。

## 案例

### 验证:三种日志的走查核对

验证:redo 断言(崩溃后重启→redo 重放恢复——理论推演,未实际断电);undo 断言(回滚事务→数据还原);binlog 断言(binlog 格式与事件内容——mysqlbinlog 工具查看);两阶段提交断言(崩溃恢复按 redo 状态+binlog 判断——database-basics 28 题的内部两阶段提交)。验证:日志断言可程序化(MySQL 实测+崩溃模拟)。

### 追问链:日志三刀

一刀:"redo 的 WAL 为什么快?"——WAL 先写日志(redo,顺序写)再写数据页(随机写)——顺序写比随机写快数倍;数据页延迟刷盘(合并多次修改)——WAL=将随机写转化为顺序写。二刀:"binlog 与 redo 的区别?"——binlog=Server 层,逻辑日志(所有引擎共用),追加写;redo=InnoDB 层,物理日志(仅 InnoDB),循环写——分工:redo 管崩溃恢复,binlog 管复制与 PITR。三刀:"undo 的 MVCC 链?"——每行隐藏列 trx_id+roll_pointer→undo log 的历史版本链→Read View 沿链判断可见性(第 19 题数据库 MVCC 版本链与可见性判定)。

## 总结点

1. redo 恢复,undo 回滚+MVCC,binlog 复制
2. 两阶段提交保证 redo-binlog 一致
3. WAL=顺序写替代随机写
