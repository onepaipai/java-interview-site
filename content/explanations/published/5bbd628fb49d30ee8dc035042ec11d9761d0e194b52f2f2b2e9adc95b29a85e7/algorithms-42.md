<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 倒序使本轮物品不会重复利用，正序可能变成允许多次使用的语义。
2. 初始化还需区分容量上限与必须恰好装满。

## 参考分析

1. 倒序保证 dp[j-weight] 仍是上一轮状态。
2. 正序会在同轮复用本件。
3. 容量上限和必须恰好装满的初始化不同。

## 案例

1. 场景（教学示例）：容量 4，仅一件重量 2、价值 3 的物品。

2. 处理：定义 dp[j] 为不超过 j 的最大价值，并从容量倒序到重量更新；对照正序错误实现。

```java
int capacity = 4, weight = 2, value = 3;
int[] dp = new int[capacity + 1]; // 容量不超过 j 的最大价值
for (int j = capacity; j >= weight; j--) {
    dp[j] = Math.max(dp[j], dp[j - weight] + value);
}
System.out.println(dp[4]); // 3；正序误用同一件会得到 6
```

3. 验证：正确 dp[4]=3，错误正序得到 6；空物品和容量不足得到 0。

## 总结点

1. 倒序避免同件重复用。
2. 状态语义决定初始化。
