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

## 如何修改前端开发端口

**开发服务器端口** `apps/admin/.env.development`

```bash
# 开发服务器监听端口，默认 7878
VITE_SERVER_PORT="7878"
```

修改后重启 dev server 生效；端口只影响本地访问地址，与接口代理（`VITE_BASE_URL`）互不影响。

## 如何修改数据库表结构

表结构由 TypeORM 迁移管理，`MYSQL_SYNCHRONIZE` 保持 `false`，不要直接改库。在 `apps/server` 目录下：

```bash
# 1. 改实体：src/**/*.entity.ts
# 2. 对比实体与当前库，生成增量迁移
pnpm typeorm migration:generate src/database/migrations/<改动名>
# 3. 检查生成的 up() / down()，把迁移文件提交进仓库
# 4. 执行迁移
pnpm migration:run
```

`init-db.mjs` / `pnpm db:init` 只用于空库首装，已上线的库请走上面的增量迁移，详见 [生产部署](./deployment#表结构变更)。

## 如何把主键从 UUID 切换为 int

模板默认使用 UUID 主键。如果新项目希望数据库和代码统一使用 `int` 自增主键，可在**新克隆且尚未初始化数据库**时，在仓库根目录执行：

```bash
# 预览将要修改的文件与种子主键映射
node scripts/convert-pk-to-int.mjs --dry-run

# 执行转换（二选一）
node scripts/convert-pk-to-int.mjs --apply

# 或：依赖已安装时，转换后立即执行前后端构建验证
node scripts/convert-pk-to-int.mjs --apply --verify
```

脚本会同时修改：

- 后端实体的主键、外键与 `@PrimaryGeneratedColumn`
- DTO、Controller、Service 中的 ID 类型与参数解析
- 前端 API 类型、页面 ID 处理与树根节点
- `resource/init.sql` 的主键列、外键列、种子数据和 `ancestors` 链

> - 仅支持新克隆 + 空库。已经执行过 `pnpm db:init`、仓库中已有迁移文件，或数据库中已有 UUID 数据时，脚本会拒绝执行。
> - 执行顺序必须是：先转换，再 `pnpm install` 和 `pnpm db:init`。
> - 转换前请保持工作区没有未提交的已跟踪改动，便于用 `git checkout -- .` 回滚。
> - 存量 UUID 数据库不做一键迁移，需要单独设计数据迁移方案。

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
