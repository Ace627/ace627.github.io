# 项目介绍

## 工程组织

前后端放在**同一个仓库**中，但是两个互不引用的独立 pnpm 工程，分别位于 `apps/admin` 与 `apps/server`：

```
nestjs-admin-template
├── apps/
│   ├── admin/                     # 前端工程（Vue 3 + Element Plus + Vite 8）
│   │   ├── package.json
│   │   ├── pnpm-lock.yaml
│   │   ├── pnpm-workspace.yaml    # 仅承载 pnpm 配置，无 packages 子包声明
│   │   ├── build/                 # Vite 构建配置与插件（自动导入、SVG 雪碧图、压缩）
│   │   ├── test/                  # vitest 单元测试
│   │   └── src/
│   └── server/                    # 后端工程（NestJS 12 + TypeORM + MySQL + Redis）
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── pnpm-workspace.yaml    # 同上，仅 pnpm 配置
│       ├── ormconfig.ts           # TypeORM CLI 专用数据源（生成 / 执行迁移）
│       ├── scripts/               # init-db.mjs / healthcheck.js
│       └── src/
│           └── database/migrations/  # 基线迁移（首次 db:init 生成后提交）
├── config/
│   └── docker/Dockerfile.server   # 后端生产镜像（构建上下文为仓库根）
├── resource/
│   └── init.sql                   # 种子数据来源，脚本只提取其中的 INSERT
├── scripts/                       # 仓库级脚本（镜像构建、init.sql 生成、SVG 清理）
├── docs/                          # 本地文档
├── dist/                          # 离线镜像 tar 等构建产物（不入库）
├── .dockerignore                  # 镜像构建忽略规则，必须留在仓库根
├── prettier.config.cjs            # 前后端共用的格式化配置
└── AGENTS.md                      # AI 辅助开发协作约定
```

- **两端各自安装**：进入 `apps/admin` 或 `apps/server` 执行 `pnpm install`，没有根级 workspace 依赖提升，也不存在幽灵依赖；单独把某个目录拷走仍可安装、构建、运行
- `pnpm-workspace.yaml` 不含 `packages` 声明，只承载镜像源、`saveExact`、`allowBuilds` 等 pnpm 配置
- 仓库根不再有 `package.json` 与 `docker-compose.yml`，可执行脚本一律是 `scripts/*.mjs`，用 `node` 直接运行
- 前后端共用根目录一份 `prettier.config.cjs`，保证代码风格统一
- 表结构由迁移管理；`resource/init.sql` 是脚本从开发库导出的完整快照（含建表语句与 `INSERT`），初始化时只提取其中的 `INSERT` 作为种子数据，不要手工执行整份文件

## 前端目录结构

```
apps/admin
├── build/                       # Vite 构建配置与插件（自动导入、SVG 雪碧图、gzip 压缩）
├── test/                        # vitest 单元测试，目录结构与 src 对应
├── vitest.config.ts             # 测试独立配置，不加载业务构建插件
└── src
    ├── main.ts                  # 入口：styles → plugins → directives → store → router
    ├── App.vue
    ├── defaultSettings.ts       # 布局默认配置（侧边栏、主题等）
    ├── api/                     # 请求层，文件名约定 *.request.ts
    │   ├── auth.request.ts
    │   ├── dashboard.request.ts
    │   ├── common/upload.request.ts
    │   ├── monitor/             # 服务监控 / 缓存 / 任务 / 日志 / 在线用户
    │   └── system/              # 用户 / 角色 / 菜单 / 部门 / 字典 / 文件 / 参数
    ├── assets/
    │   ├── images/
    │   └── svg-icons/           # 本地 SVG 图标（构建时合成雪碧图）
    ├── components/              # 全局通用组件（详见「组件文档」）
    ├── directives/              # 自定义指令（v-permissions / v-roles）
    ├── hooks/                   # useDict / useTheme / useConfig / useResize 等组合式函数
    ├── layout/                  # 后台整体布局（Navbar / Sidebar / TagsView / AppMain）
    ├── plugins/                 # 插件注册（全局组件等）
    ├── router/
    │   ├── index.ts             # createRouter + 守卫挂载
    │   ├── router.constant.ts   # 路由常量与白名单
    │   ├── router.guard.ts      # 全局前置守卫：token → getInfo → 动态路由
    │   ├── router.helper.ts     # 后端菜单递归建树 + 动态组件加载
    │   └── modules/static.route.ts  # 静态路由（login / 404 / 个人中心等）
    ├── store/modules/           # app / permission / setting / tags-view / user
    ├── styles/                  # 全局样式与 Element Plus 主题定制
    ├── types/                   # 类型定义（api/ 与请求层一一对应）
    ├── utils/                   # 工具层
    │   ├── cache/               # StorageCache 与领域缓存（token / 标签页 / 列显隐等）
    │   ├── browser/             # CSS 变量、表格打印等浏览器能力
    │   ├── request/             # axios 实例与拦截器（鉴权、刷新令牌、错误提示）
    │   └── ...                  # convert / validate / file / tip-modal 等
    └── views/                   # 页面（系统管理、监控、个人中心、示例页等）
```

## 后端目录结构

```
apps/server
├── ormconfig.ts               # TypeORM CLI 数据源：迁移生成与执行只走这里
├── scripts/
│   ├── init-db.mjs            # 数据库一键初始化（建库 → 生成基线迁移 → 建表 → 种子数据）
│   └── healthcheck.js         # 容器健康探针
└── src
    ├── main.ts                # 启动入口：Helmet、全局前缀、静态资源、优雅关闭
    ├── app.module.ts          # 根模块：全局管道 / 守卫 / 拦截器 / 过滤器注册
    ├── configuration.ts       # 集中读取环境变量（server/redis/database/jwt）
    ├── database/migrations/   # 迁移文件（首次 db:init 生成 baseline 后提交入库）
    ├── common/                # 公共层
    │   ├── class/             # AjaxResult 统一响应封装
    │   ├── constant/          # 常量（配置键、字典、业务类型、RBAC 等）
    │   ├── decorator/         # 自定义装饰器（详见「后台手册」）
    │   ├── dto/               # 公共 DTO（分页参数等）
    │   ├── entities/          # 公共实体（BaseEntity 等）
    │   ├── exception/         # 业务异常
    │   ├── filter/            # 全局异常过滤器
    │   ├── guard/             # JWT 鉴权 / 权限码 / 角色 / 防重提交 / 限流 / 演示模式
    │   ├── interceptor/       # 响应转换 / 操作日志 / 数据权限 / 响应缓存
    │   ├── middleware/        # 中间件（请求标识）
    │   ├── module/            # 数据库 / Redis / 队列等公共模块
    │   └── pipe/              # 分页参数管道
    ├── modules/
    │   ├── auth/              # 登录认证：验证码、JWT 签发、刷新令牌
    │   ├── system/            # 用户 / 角色 / 菜单 / 部门 / 字典 / 文件 / 参数
    │   ├── monitor/           # 服务监控 / 缓存 / 健康检查 / 在线用户 / 定时任务 / 日志 / 登录锁定
    │   ├── common/            # 通用能力：文件上传、Excel 导入导出
    │   └── dashboard/         # 首页看板数据
    ├── shared/                # 跨模块共享服务（Redis、验证码、登录锁定）
    ├── types/                 # 类型定义
    └── utils/                 # 工具函数（密码加密、IP 归属地解析等）
```

## 后端模块说明

| 模块        | 职责                                                         |
| ----------- | ------------------------------------------------------------ |
| `auth`      | 图形验证码生成校验、账号密码登录、JWT 签发、刷新令牌         |
| `system`    | 用户、角色、菜单、部门、字典、文件、参数七大核心管理模块     |
| `monitor`   | 服务监控、缓存监控、健康检查、在线用户、定时任务、操作/登录日志、登录锁定 |
| `common`    | 文件上传（单文件 / 分片 / 秒传 / 断点续传）、Excel 导入导出模板 |
| `dashboard` | 首页看板统计数据                                             |

## 数据库与迁移

- 建表与改表统一由 TypeORM 迁移管理，`MYSQL_SYNCHRONIZE` 在生产环境保持 `false`
- 空库首装执行 `apps/server` 下的 `pnpm db:init`（即 `node scripts/init-db.mjs`）：建库 → 无迁移文件时从实体生成 baseline 迁移 → 执行迁移 → 从 `resource/init.sql` 提取 `INSERT` 写入种子数据
- 之后改实体即走增量迁移：`pnpm typeorm migration:generate src/database/migrations/<改动名>` → `pnpm migration:run`
- `ormconfig.ts` 中迁移表名为 `sys_migrations`，实体路径 `src/**/*.entity.ts`，迁移路径 `src/database/migrations/*.ts`
- 详细命令与上线流程见 [生产部署](./deployment#表结构变更)

## 测试

- 前端使用 `vitest`，配置文件 `apps/admin/vitest.config.ts` 独立于业务构建，只加载 `test/**/*.spec.ts`，运行环境为 `node`
- 现有用例覆盖 `src/utils` 下的类型转换、校验与时间工具，目录结构与 `src` 对应
- 运行：`cd apps/admin && pnpm test`（监听模式）或 `pnpm test:run`（单次执行）
- 后端 `apps/server` 已预留 Jest 脚本（`test` / `test:e2e`），当前未编写测试用例

## 认证机制

- 登录采用 **JWT + 图形验证码**，密码使用 **Argon2** 加密存储
- 认证基于 **Passport 策略模式**，职责分离，便于扩展新的登录方式
- 访问令牌有效期由 `JWT_EXPIRES_IN` 控制（默认 1800 秒），会话状态存于 Redis，支持在线用户查看与强制下线
- 访问令牌过期后，前端携带刷新令牌（`JWT_REFRESH_EXPIRES_IN`，默认 7 天滑动续期）静默换新，用户无感知；刷新时同步重建鉴权缓存与在线记录
- 公开路由（登录、验证码、健康探针等）使用 `@Public()` 装饰器跳过鉴权
