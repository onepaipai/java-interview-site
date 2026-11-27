<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账户号检索沙盘:输入前缀即时联想完整账号——哈希表只能整键查,Trie 按字符逐层走,前缀查询 O(长度);节点含 children[26]+isEnd+可选计数。

1. 结构=多叉树,每边一个字符:insert 从根逐字符走/建节点(无则新建),末字符标 isEnd;search 整词查到且 isEnd==true;startsWith 前缀只查路径存在(不看 isEnd);删除:递归到叶回溯删节点(父无其他子才删,防误删共享前缀)+清 isEnd。
2. 查询复杂度:插入/查询/前缀全部 O(L)(L=键长,与键数无关)——这是 Trie 对哈希的碾压点:前缀查询哈希无解(要全表扫);空间 O(总字符数×节点开销)——children[26] 数组每节点 26 槽,键集大时内存放大明显。
3. 工程优化:数组→HashMap<Character,Node>(稀疏字符集省内存)或压缩路径(Radix Tree,单字符链合并成一个边,前缀共享度高时省 10 倍+);计数用途(统计前缀命中):节点加 pass 计数,删除时沿途-1;自动补全=前缀节点下 DFS 收集(限流条数)。

## 参考分析

### 第二步扩展① 机制:Trie 为什么把前缀查询变 O(L)

- 哈希表把整个键哈希成一个槽——前缀 s 与完整键 s+abc 在哈希世界毫无关系。
- Trie 把键拆成路径,所有共享前缀的键物理共享同一段路径——查询前缀=沿路径走 L 步,天然 O(L)。
- 「共享结构」是空间换查询时间的极致:字典树的空间被公共前缀摊薄,而查询速度与键总量解耦(百万键与十键查速相同)——对比二分查找 O(L log n)(比较键本身)。

### 第二步扩展② 反例:Trie 的三种事故

- 事故一:search 不查 isEnd——前缀「acc」误命中「account」(把前缀当整词)。
- 事故二:删除只清 isEnd 不回收节点——空分支堆积内存泄漏。
- 但回收要判「父节点是否还有别的子」(共享前缀不能误删)。
- 事故三:children[26] 遇大写/中文/emoji——越界或漏字。
- 字符集统一化(小写化+码点)或 HashMap 子节点。

### 第二步扩展③ 取舍:Trie vs 哈希 vs 排序数组

- 前缀查询为主:Trie 唯一 O(L)。
- 整键查为主:哈希 O(1) 且省内存。
- 静态键集+前缀:排序数组+二分(第 17 题 lowerBound 前缀范围)O(log n) 查+零指针开销——键集固定且内存敏感时最优。
- 动态增删+联想:Trie。
- 混合:布隆过滤器预筛(第 15 题追问)+Trie 兜底。
- 字符串多模式匹配再进一步是 AC 自动机(Trie+失配跳转)。

## 案例

### 第三步发散·验证与推演 验证:Trie 断言组(本机可复跑)

- 验证:整词断言(insert app。
- search app==true。
- search ap==false——isEnd 生效)。
- 前缀断言(startsWith ap==true。
- startsWith ax==false)。
- 删除断言(delete apple 后 search apple==false 但 startsWith app==true 若 app 仍存在——共享前缀不误删)。
- 数量断言(前缀计数 pass 一致)。
- Unicode 断言(中文键经 HashMap 子节点可查)。
- 预期:isEnd 与共享删除是两组核心判据。

### 第三步发散·发散要点 追问链:Trie 三刀

- **追问①**：AC 自动机——Trie+KMP 式失配指针,多模式串一次扫描匹配(敏感词过滤的工业解);
- **追问②**：压缩 Radix Tree——单字符链合并,LinkedIn 式路由表/域名匹配用;
- **追问③**：工程迁移——账号联想/URL 路由匹配(第 150 题接口版本路由同构)/拼写纠错(编辑距离限制的 DFS,第 44 题编辑距离同源);海量键的内存账:26 槽数组 vs HashMap 的临界点在键集字符分布

## 总结点

1. 前缀共享,查询 O(L)
2. search 看 isEnd,startsWith 不看
3. 删除要判共享,数组 26 槽注意字符集
