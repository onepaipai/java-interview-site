<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 记录字符最近位置，让左边界只向前移动，遇到重复时跳过旧位置。
2. 字符单位需按业务区分代码单元与 Unicode 码点。

## 参考分析

1. 左边界只能向前，更新时取 max(旧左边界,重复位置+1)。
2. 按每个字符常数查表时 O(n)，字符单位要与需求一致。

## 案例

1. 场景（教学示例）：字符串 abba。

2. 处理：记录每个字符最后位置，第二个 b 推进左界；最后的 a 不能把左界退回。

3. 验证：最长无重复长度为 2；不是错误的 3，空串与非 ASCII 按约定单位测试。

## 总结点

1. 左边界绝不后退。
2. 重复位置只推进边界。
