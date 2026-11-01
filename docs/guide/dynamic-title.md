# 动态标题

浏览器标签页标题随路由自动切换：进入带标题的页面显示「页面标题 - 应用标题」，其余场景显示应用标题。由 `useDynamicTitle` Hook 在根组件统一驱动，应用标题取自 `apps/admin/.env` 的 `VITE_APP_TITLE`（默认 `NestJS Admin Template`）。

## 工作原理

根组件 `App.vue` 调用 `useDynamicTitle()`（Hook 与 Store 均已自动导入，无需手动 import）：

```vue
<script setup lang="ts">
useResize()
useDynamicTitle()
</script>
```

Hook 内部监听「当前路由路径」与「动态标题开关」两个响应源，`immediate: true` 保证首次挂载即生效：

```ts
export function useDynamicTitle() {
  const route = useRoute()
  const settingStore = useSettingStore()
  const appTitle = import.meta.env.VITE_APP_TITLE

  watch(
    [() => route.path, () => settingStore.showDynamicTitle],
    ([_, showDynamicTitle]) => {
      if (!showDynamicTitle || !route.meta.title) {
        document.title = appTitle
      } else {
        document.title = `${route.meta.title} - ${appTitle}`
      }
    },
    { immediate: true },
  )
}
```

标题取值规则：

| 场景 | 标签页标题 |
| --- | --- |
| 开关开启，且当前路由有 `meta.title` | `页面标题 - 应用标题` |
| 开关开启，路由无 `meta.title`（如 404） | `应用标题` |
| 开关关闭 | `应用标题` |

## 标题来源

`meta.title` 就是页面在菜单中显示的名称：

- **动态路由**：登录后由后端菜单表下发，改菜单名称即改标题
- **静态路由**：在 `src/router/modules/static.route.ts` 手写（如首页、个人中心、调度日志）

## 开关配置

默认配置在 `src/defaultSettings.ts`，`showDynamicTitle: true` 默认开启：

```ts
export interface SystemSetting {
  /** 是否显示动态标题 */
  showDynamicTitle: boolean
  // ...
}
```

运行时无需改代码：系统设置面板（导航栏右上角齿轮）提供「动态标题」开关，点击「保存设置」后经 `settingStore.saveSetting()` 写入 `localStorage`（`StorageCache` 键 `systemSetting`），下次启动与 `defaultSettings` 合并恢复，刷新后依然生效；「重置设置」会清除该缓存并回退到默认值。

::::: tip
想调整标题格式（如倒序「应用标题 - 页面标题」、去掉后缀），修改 `useDynamicTitle.ts` 中的模板字符串即可，全部逻辑只在这一个 Hook 里。
:::::
