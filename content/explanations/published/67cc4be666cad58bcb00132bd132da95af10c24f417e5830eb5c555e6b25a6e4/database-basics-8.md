<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html)

</details>

## 参考回答

1. 普通有序索引可按已知前缀定位连续范围；LIKE 的任意包含模式缺少固定起点，通常难以做同样的范围定位。
2. 不等于索引完全不能被扫描或覆盖使用；大规模包含检索需按分词、语言和匹配语义评估全文或专用检索。

## 参考分析

1. LIKE 的百分号和下划线具有模式含义，用户想找字面字符时需要正确转义并绑定值。
2. 全文检索的词匹配不等同任意子串，不能为性能无提示改变结果语义。

## 案例

1. 教学场景：编码 prefix% 查询快，改为 %prefix% 后候选扫描大增。

2. 固定数据与排序规则比较两类计划和结果，明确产品需要前缀、词还是任意包含。

3. 验证新方案保持所需匹配，特殊字符安全处理；索引扫描与高效定位分别记录。

## 总结点

1. 前缀提供有序范围起点。
2. 词检索不等于任意子串。
