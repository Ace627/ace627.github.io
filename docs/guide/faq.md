# 常见问题

## 如何新增系统图标

1. 从 [iconfont](https://www.iconfont.cn/) 下载 SVG 图标，重命名为大驼峰格式（如 `User.svg`）
2. 放入 `apps/admin/src/assets/svg-icons/` 目录
3. 在**仓库根目录**执行清理脚本，移除冗余属性并压缩体积：

```bash
node scripts/clean-svg-icons.mjs
```

4. 刷新浏览器即可生效，模板中直接使用 `<SvgIcon name="User" />`

内置「图标管理」页面（`apps/admin/src/views/system/icon`，随系统菜单动态加载）可预览全部图标并单击复制组件代码。改色、尺寸等详细说明见 [图标使用](./svg-icon)。

## 如何调整左侧菜单宽度

侧边栏宽度由 CSS 变量统一控制，定义在 `apps/admin/src/styles/variables.scss`，修改值即可，布局层引用同一变量，全局自动联动：

```scss
html {
  /* 侧边栏展开宽度，默认 220px */
  --el-sidebar-width: 220px;
  /* 侧边栏折叠宽度，默认 64px */
  --el-sidebar-hide-width: 64px;
}
```

## 如何更换后端请求地址

**开发环境** `apps/admin/.env.development`

```bash
# 后端接口地址（Vite 代理的 target），默认本机 3000
VITE_BASE_URL="http://localhost:3000"
```

修改后重启 dev server 生效。代理配置在 `vite.config.ts` 中：请求前缀 `/dev-api/api` 会被转发到 `VITE_BASE_URL` 并去掉 `/dev-api` 前缀，一般无需改动。

## 如何设置接口的超时时间

**全局超时时间设置** `apps/admin/.env`

```bash
# 接口超时时间（秒），0 表示无超时，默认为 0
VITE_REQUEST_TIMEOUT="10"
```

**针对某个单独接口设置超时时间**

```ts
// 在请求配置中单独传入 timeout（毫秒），会覆盖全局值
export function findReportList(params: ReportQuery) {
  return request.get('/report/list', { params, timeout: 30000 })
}
```
