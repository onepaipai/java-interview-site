<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：MySQL 8.4 / InnoDB 教学实验：orders 有主键 id、二级索引 (tenant_id, status) 和不在该索引内的 note 字段。比较过滤条件执行位置与查询所需列，执行计划受数据分布和优化器选择影响。

1. 索引条件下推（ICP）让存储引擎先用索引中可判断的条件过滤候选项，减少读取完整记录的次数；它并不要求查询所有列都在索引中。
2. 覆盖索引指一次查询需要的列都能从所选索引获得，从访问方式上避免为缺失列读取主记录。InnoDB 二级索引还保存主键值。
3. 两者关注不同阶段：ICP 先过滤再按需取行，覆盖索引减少取行需求。应结合实际计划、查询列和读行指标比较，不能只凭索引名或一个 Extra 字样认定性能。

## 参考分析

### 第二步扩展① ICP 的收益来自过滤发生在取整行之前

- 索引找到候选范围后，如果还有能用索引列判断的条件，引擎可先排除不满足的索引项，再读取需要的主记录。
- InnoDB 的 ICP 用于符合条件的二级索引访问。
- 不是任意表达式、任意访问方式都能下推。
- 讨论时应明确哪个谓词负责范围定位，哪个谓词用于索引内过滤。
- 类比快递分拣：在分拣中心先按区域筛掉一部分（ICP），剩下的才搬运上楼（回表）——筛得越早，搬得越少。

### 第二步扩展② 覆盖的条件来自本次查询所需的列

- 同一个索引可以覆盖只查 id、tenant_id、status 的查询，却不能覆盖还需要 note 的查询，因为 note 不在索引里。
- 覆盖是索引与查询共同形成的性质，不是给某个索引永久贴的标签。
- 把所有列都加到索引也会增加体积和更新成本，需要结合真实读写负载决定。

### 第二步扩展③ 计划解释：两种 Using 提示不能互换

- 传统 EXPLAIN 的 Using index 常提示覆盖访问，Using index condition 表示索引条件下推，二者不能按名字互相替代。
- 执行计划还可能因小表、选择率或成本估计选择别的路径。
- 应比较返回行数、候选访问量和执行耗时，并确认统计条件一致。
- EXPLAIN ANALYZE 会实际执行查询。

## 案例

### 第三步发散·验证与推演 对照查询：只改变是否需要 note

- 在隔离 MySQL 8.4 测试库准备足够的租户、状态分布与索引，先确认查询一所需字段均可由二级索引取得，再让查询二读取 note。
- 通过范围条件与索引内状态过滤观察两阶段差异。
- 以下是待在目标数据库运行的实验查询，不宣称已有固定计划结果。
```sql
EXPLAIN SELECT id, tenant_id, status FROM orders
WHERE tenant_id BETWEEN 10 AND 20 AND status = 'PAID';
EXPLAIN SELECT id, note FROM orders
WHERE tenant_id BETWEEN 10 AND 20 AND status = 'PAID';
```

### 第三步发散·追问① 验证与追问：为什么看不到预期提示

- 先核对索引定义、查询列和数据量，再记录实际选中的 key、访问类型与 Extra。
- 必要时在同样数据下对照开启和关闭 index_condition_pushdown 的计划，并恢复会话设置。
- 预期是覆盖查询无需为 note 取行，而非覆盖查询有机会从索引内过滤受益。
- 若优化器选择全表扫描，应解释成本条件，不把提示缺失当作数据库失效。

## 总结点

1. 分拣早筛一遍，上楼少搬一层
2. ICP 先过滤，覆盖减少取行需求
3. 覆盖取决于本次需要哪些列
4. Using index 与 index condition 分开看
