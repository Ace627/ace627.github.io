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
