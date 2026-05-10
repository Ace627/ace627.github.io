# 常见问题

## 如何新增系统图标

- 从 [iconfont](https://www.iconfont.cn/) 选择并下载 SVG 图标
- 重命名为大驼峰格式（如 `User.svg`），放入 `src/assets/icons`
- 在项目根目录执行 `pnpm svg:clean` 清理冗余属性并压缩
- 刷新浏览器（若图标空白，刷新即可，无需重启项目）
- 使用 `<SvgIcon name="User" />` 组件显示图标

## 如何新增全局组件

- 创建组件文件 `src/components/MyComponent/index.vue`
- 如需类型定义，创建 `src/components/MyComponent/types.ts`
- 有类型时，在 `src/types/index.ts` 中统一导出类型
- 在 `src/plugins/modules/global-component.ts` 中注册全局组件
- 在 `types/global-component.d.ts` 中注册全局组件类型（提供 TS 提示）
- 之后即可在任意页面直接使用 `<MyComponent />`

## 如何使用组件缓存

- **问题背景**：动态加载的组件没有静态 name，KeepAlive 无法匹配导致缓存失效
- **传统做法**：手动写 `defineOptions({ name: 'xxx' })`，但页面多易遗漏
- **解决方案**：在组件加载时自动注入 name

```typescript
// router.helper.ts
export function loadView(componentPath: string) {
  // ...
  const componentName = upperFirst(camelCase(componentPath.replace('index', '')))
  const component = views[path]
  return () => component().then((comp) => ((comp.default.name = componentName), comp))
}
```

- **使用说明**：动态页面无需手动写 `defineOptions`，只有静态路由（如 404）才需要
