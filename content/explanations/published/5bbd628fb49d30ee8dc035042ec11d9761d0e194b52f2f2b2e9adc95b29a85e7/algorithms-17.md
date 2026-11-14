<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银时间窗查询沙盘:日志数组按时间排序,查 [start,end] 区间内的条数——精确命中不够,要「第一个 >=start」与「第一个 >end」;左右边界=lowerBound/upperBound 两次二分。

1. 左边界 lowerBound:第一个 >=target 的下标——nums[mid]>=target→hi=mid(压缩),否则 lo=mid+1;右边界 upperBound:第一个 >target——判定改 nums[mid]>target;区间条数=upper(end)-lower(start) 按开闭换算。
2. 与「精确命中」的关系:lowerBound(nums,target)==i 且 nums[i]==target 才是命中;lowerBound 恒有定义(哪怕 target 不存在)——这是它比「找到返回/找不到 -1」更适合生产的原因:范围查询/插入位置/去重统计全部直接可用。
3. 实现纪律:两个函数共用同一区间约定(左闭右开最简);区间内条数要防溢出(int 差值没问题但转换 long 的习惯);边界校验:target 小于全数组→lower==0 upper==0;大于全数组→两者==len;全等数组([2,2,2] 查 2)→lower==0 upper==3。

## 参考分析

### 机制:压缩方向决定边界语义

边界二分的本质=「往满足条件的一侧持续压缩到单点」:左边界把 >=target 的段不断向左压(hi=mid 保留 mid,因为 mid 可能是答案),不满足就整段跳过(lo=mid+1);终止时 lo 是「第一个满足」——把「查找」变成「压缩区间到不变式成立的最小下标」,这与第 16 题的不变式思想同源,只是答案从「命中」变成「分界点」。

### 反例:边界查询的三种事故

事故一:hi=mid-1 用在左边界——mid 恰是第一个满足者时被排除,答案左移(漏);事故二:区间条数用 length 减下标不换算开闭——差 1 错误,测试用「单元素区间」暴露;事故三:浮点/时间戳比较用 == 定边界——浮点误差或时间戳精度不一致导致边界漏判,先统一精度再二分。

### 取舍:两次二分 vs 一次合并查询

标准做法:lowerBound+upperBound 两次独立调用(各自 O(log n),代码复用);合并写法(一次循环同时求两端)常数小但易错——不值得;数据结构升级:需要频繁区间统计→TreeMap(subMap) 或前缀和(静态数据);边界二分是所有「有序+统计」查询的原语。

## 案例

### 验证:边界断言组(本机可复跑)

验证:全小于断言(target=0,lower==upper==0,区间数 0);全大于断言(target=99,两者==len);夹缝断言([1,3,5] 查 4→lower==2 upper==2,条数 0);全等断言([2,2,2] 查 2→lower 0 upper 3 条数 3);区间统计断言(时间窗 [10:00,10:05] 的日志条数与线性扫描对照——N 条随机时间戳双方法一致)。预期:分界语义与统计正确性双闭环。

### 追问链:边界三刀

一刀:JDK 对应——Arrays.binarySearch 找不到返回 -(插入点)-1,插入点即 lowerBound;Collections.binarySearch 同。二刀:二维/矩阵边界——每行二分+整体右上角阶梯搜索,边界语义不变。三刀:二分答案的应用——「满足条件的最小 x」一律 lowerBound 压缩思想(第 16 题三刀延伸),check 单调性是前提。

## 总结点

1. 左边界>=,右边界>,压缩方向定语义
2. lowerBound 恒有定义
3. 区间条数=两边界之差
