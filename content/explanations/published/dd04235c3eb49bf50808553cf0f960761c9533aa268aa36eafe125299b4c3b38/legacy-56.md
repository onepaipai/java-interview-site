<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [事件溯源设计说明 · 1](https://martinfowler.com/articles/patterns-of-distributed-systems/)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银团队沙盘:feature 分支合入 main——merge(保留分支历史,合并节点)vs rebase(线性历史,变基)——团队选择=历史可读性 vs 安全性。

1. merge:创建合并节点(两个父节点)——保留完整分支历史;历史非线性(分叉)但安全(不改变已有提交);适合公共分支(main/release)合入。rebase:将提交搬到目标分支末尾(重写哈希)——历史线性;危险=改变已推送提交(重复提交);适合个人 feature 分支。
2. 冲突处理:两边修改同一行→Git 标记冲突(<<<<<<< HEAD ======= >>>>>>>)→人工选择/融合→git add 标记解决→继续——冲突预防=小步提交+频繁 rebase(减少 divergence)。
3. 团队工作流:Git Flow(master+develop+feature+release+hotfix)vs GitHub Flow(main+feature)vs Trunk Based(主干+短命分支)——按发布频率+团队规模+回滚需求选(第 39 题灰度)。

## 参考分析

### 第二步扩展① 机制:merge 与 rebase 的历史观差异

- merge 保留事实(确实在分支开发的)。
- rebase 保留整洁(历史像一次完成的)——两种历史观各有价值:merge 的分叉真实反映开发过程。
- rebase 的线性更易阅读(bisect/cherry-pick 方便)。
- 类比历史书:编年体 vs 纪事本末体。

### 第二步扩展② 反例:Git 操作的两种事故

- 事故一:公共分支 rebase——改写已推送提交→其他人分支出现幽灵提交(冲突+重复)。
- 修复=黄金法则:已推送的公共分支不 rebase。
- 事故二:merge 前未 pull——基于旧 main 合并→合并后又需再 merge。
- 修复=merge 前先 pull(或 rebase)。

### 第二步扩展③ 取舍:Git Flow vs GitHub Flow

- Git Flow(多分支:master/develop/feature/release/hotfix)适合版本发布周期。
- GitHub Flow(main+feature)适合持续部署。
- Trunk Based(主干+短命分支)适合高频部署+特性开关——按发布频率+回滚需求选。

## 案例

### 第三步发散·验证与推演 验证:Git 操作的走查核对

- 验证:merge 断言(合并节点+分支历史保留)。
- rebase 断言(提交哈希改变+线性历史)。
- 冲突断言(冲突标记+解决后 continue)。
- rebase 危险断言(已推送分支 rebase+force push 导致协作者问题)——四组固化 Git 操作语义。

### 第三步发散·发散要点 追问链:Git 三刀

- **追问①·squash merge**：多个提交合并为一个(合入 main 时只留一个)——保持整洁但丢失细粒度历史
- **追问②·cherry-pick**：从其他分支摘取特定提交(不合并整个分支)——适合只想要某个 fix
- **追问③·Git hook**：pre-commit(提交前检查)/pre-push/post-merge——与 CI/CD 联动(第 151 题质量闸)

## 总结点

1. merge 保留历史,rebase 线性整洁
2. 公共分支不 rebase(黄金法则)
3. 冲突预防=小步提交+频繁 rebase
