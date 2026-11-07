<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/replication.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)

</details>

## 参考回答

1. 异步复制接收和应用可能晚于主库提交确认，副本暂时看不到不代表写失败。
2. 必要读己之写可路由主库，或使用明确一致水位；固定 sleep 不保证任意负载下追上。

## 参考分析

1. 主库读取也可能处于旧快照，还要核对事务与缓存，不能只改路由。
2. 水位等待需要超时和回退，不能无限阻塞全部请求。

## 案例

1. 教学场景：创建成功后副本详情暂时 404，用户重试又下了一单。

2. 用稳定业务键确认写入，定义路由和水位，注入副本延迟及缓存旧值。

3. 验证约定窗口内读到自己结果，未决不被误报失败，重试不换新业务键。

## 总结点

1. 异步复制有可见性窗口。
2. 路由、快照和缓存一起核对。
