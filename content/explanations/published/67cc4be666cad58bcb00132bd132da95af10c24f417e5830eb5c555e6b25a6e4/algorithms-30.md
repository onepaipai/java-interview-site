<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 按字符路径保存节点与结束标记，插入和查询成本与字符串长度相关。
2. 需要评估字符集、节点稀疏度及内存，而非只画树。

## 参考分析

1. 前缀存在与完整词存在依赖不同标记。
2. 插入查询 O(L)，空间与节点总数和字符集相关，不能固定当 O(1)。

## 案例

1. 场景（教学示例）：只插入 apple，查询 app 与 startsWith(app)。

2. 处理：按字符路径查找，完整查词必须看到终止标记；前缀查询只需路径存在。

3. 验证：app 不是已存单词，但它是有效前缀；插入 app 后完整查词才成功。

## 总结点

1. 前缀节点不是完整词。
2. 终止标记单独保存。
