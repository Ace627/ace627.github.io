# 图标使用

项目基于 `vite-plugin-svg-icons` 实现 SVG 雪碧图方案：所有图标统一放在 `src/assets/svg-icons/` 目录，构建时自动合成雪碧图，`<SvgIcon>` 组件已全局注册，可在任意地方直接使用。

## 使用方式

```vue
<!-- name 为图标名称，对应 src/assets/svg-icons 下「清理后」的文件名（不含 .svg），必填 -->
<SvgIcon name="Search" />

<!-- color：图标颜色，可选，支持色值或 CSS 变量，默认继承当前文字颜色（currentColor） -->
<SvgIcon name="Search" color="red" />
<SvgIcon name="Search" color="var(--el-color-primary)" />

<!-- size：图标大小，可选，默认 1em；number 自动加 px，string 原样（如 '16px' / '2rem'） -->
<SvgIcon name="Search" :size="24" />
<SvgIcon name="Search" size="1.5em" />
```

:::: tip
组件内部通过 `<use href="#icon-{name}">` 引用雪碧图 symbol（`symbolId` 格式为 `icon-[name]`，在 `build/plugins/svg-icons-plugin.ts` 中配置），尺寸默认 `1em × 1em` 并随父级字号缩放，与文字排版天然对齐。
::::

## 改变颜色

`SvgIcon` 默认 `fill: currentColor`，会读取父级的 `color`：

- 直接改父级的 `color` 即可让图标跟着变色
- 或通过 `color` 属性直接指定色值 / CSS 变量

:::: warning
如果你是从 [iconfont](https://www.iconfont.cn/) 下载的图标，记得先执行下方「新增图标」中的清理脚本移除 SVG 内置的 `fill` 属性，否则自带填充色会盖过 `currentColor`，导致颜色无法跟随主题。
::::

## 新增图标

1. 从 [iconfont](https://www.iconfont.cn/) 选择并下载 SVG 图标
2. 重命名为大驼峰格式（如 `User.svg`），放入 `apps/admin/src/assets/svg-icons`
3. 在**仓库根目录**执行清理脚本，移除 `fill` / `width` / `height` 等冗余属性并压缩体积（不传目录参数时默认清理 `apps/admin/src/assets/svg-icons`）：

```bash
node scripts/clean-svg-icons.mjs
```

4. 刷新浏览器即可生效（雪碧图按目录自动生成，无需手动注册，图标空白时刷新一次即可）

## 图标管理

系统内置了「图标管理」页面（`apps/admin/src/views/system/icon/index.vue`，由系统菜单动态加载），自动读取 `apps/admin/src/assets/svg-icons` 下的全部图标，以网格形式预览图标与名称：

- **搜索**：顶部输入图标名称，实时筛选
- **单击复制**：点击图标，复制 `<SvgIcon name='Xxx' />` 组件代码，粘贴即用
- **单击下载**：切换开关后，点击图标可下载对应的 `.svg` 源文件

开发时想确认某个图标叫什么、长什么样，直接在这个页面找即可，无需翻目录。

## 图标选择器

`<IconSelect>` 组件用于在页面中选择图标（如菜单管理的图标字段），会自动读取 `src/assets/svg-icons` 下的全部图标并支持按名称搜索：

```vue
<IconSelect :active-icon="form.icon" @selected="(name) => (form.icon = name)" />
```

- `activeIcon`：当前选中的图标名称
- `@selected`：选中后触发，参数为图标名称
