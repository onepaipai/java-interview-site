<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [documentation.red-gate.com · 1](https://documentation.red-gate.com/flyway/reference/usage/frequently-asked-questions)

</details>

## 参考回答

1. 已执行脚本和校验和对应实际环境，修改历史会造成漂移或校验失败；后续修订追加版本。
2. 同时规划兼容、回填和失败处理，不为启动通过就修改历史记录或跳过错误。

## 参考分析

1. 修复校验记录不等于结构修复，必须先核对真实状态和明确修复流程。
2. 未发布开发草稿与已执行迁移不同，发布后应保持可追溯。

## 案例

1. 教学场景：生产执行了 V3，开发直接修改 V3 加列，升级出现环境差异。

2. 保留发布历史，新增版本，在空库和旧库路径测试升级。

3. 验证最终结构与数据一致、历史可追踪，不通过关闭校验掩盖漂移。

## 总结点

1. 发布历史保持可追溯。
2. 后续变更追加版本。
