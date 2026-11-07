<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [router.vuejs.org · 1](https://router.vuejs.org/guide/advanced/navigation-guards.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)

</details>

## 参考回答

1. 覆盖内部导航、浏览器前后退、关闭或刷新，以及会替换编辑区的账号和路由动作。
2. 脏状态应比较当前草稿与已保存基线，保存成功后才清除；上传中的状态也需要保护。

## 参考分析

1. 应用内部路由与浏览器卸载是不同生命周期，不能只给返回按钮绑确认框。
2. beforeunload 的触发和提示文案受浏览器限制，在移动端也不可靠；重要草稿应另有恢复机制。
3. 取消离开后必须恢复原路由及输入，不能让地址栏已切换而页面还停留在旧草稿。

## 案例

1. 教学场景：编辑答案且上传未完成，用户先点模块目录，再尝试浏览器后退。

2. 内部导航统一调用离开检查，取消则保持路由与草稿；关闭或刷新使用原生卸载保护，草稿恢复另行保存。

3. 验证：目录、后退、刷新、退出登录分别测试；保存失败仍有脏状态，成功保存后不再误提示。

## 总结点

1. 内部路由与卸载分别保护。
2. 成功保存后再清脏状态。
3. 重要草稿需要恢复路径。
