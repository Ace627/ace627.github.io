# 常见问题

## 为什么选用 monorepo 架构

采用 Monorepo 架构（基于 pnpm Workspace），核心优势在于它能够完美适配 Trae 这类 AI 辅助开发工具的工作模式：首先，将 admin（Vue3 前端）和 server（NestJS 后端）集中在同一仓库，AI 工具可以获取完整的项目上下文，包括统一的目录结构、共享的类型定义和一致的代码规范，从而生成更精准、更符合项目风格的代码；其次，Monorepo 便于 AI 进行跨模块分析，无论是前后端联调还是代码重构，AI 都能理解模块间的依赖关系和调用链，提供更有价值的开发建议；最后，统一的依赖管理和脚本命令让 AI 能够更好地理解项目的构建和运行流程，在自动化生成代码时确保依赖版本一致、脚本调用正确，大幅提升 AI 辅助开发的效率和质量。

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
