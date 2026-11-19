# 环境部署

本文为纯新手准备，从零开始带你把 NestJS Admin Template 跑起来。无论你用的是 Windows、macOS 还是 Linux，只要跟着步骤走，几分钟内就能在浏览器里看到系统。

## 环境准备

启动项目之前，你的电脑需要装好以下工具。如果某项还没装，点击链接去官网下载安装即可。

| 工具    | 最低版本 | 作用                      | 安装指引                                |
| ------- | -------- | ------------------------- | --------------------------------------- |
| Node.js | ≥ 20.x   | JavaScript 运行时         | [nodejs.org](https://nodejs.org)        |
| pnpm    | ≥ 10.x   | 包管理器（比 npm 快得多） | [pnpm.io](https://pnpm.io/installation) |
| MySQL   | ≥ 8.0    | 业务数据库（本地开发需要）| [mysql.com](https://dev.mysql.com/downloads/) |
| Redis   | ≥ 7.0    | 缓存与会话（本地开发需要）| [redis.io](https://redis.io/downloads/) |

::::: tip 验证安装
在终端里依次执行以下命令，看到版本号就说明装好了：

```bash
node -v     # 应显示 v20.x.x 或更高
pnpm -v     # 应显示 10.x.x 或更高
```

模板通过 `packageManager` 锁定 `pnpm@12.18.0`，使用更低的 pnpm 时建议升级后再安装依赖。
:::::

::::: tip 只想直接上服务器？
本地开发需要自己准备 MySQL 与 Redis；只想要一个可运行的后端，走 [生产部署](./deployment) 里的离线镜像流程即可，镜像导入后配上现成的 MySQL / Redis 就能跑。
:::::

## 源码部署

项目是**单仓双工程**结构：前端在 `apps/admin`、后端在 `apps/server`，各自持有独立的 `package.json` 与 `pnpm-lock.yaml`，安装、启动、构建都在各自目录内完成，互不引用。

### 初始化后端

**1. 安装依赖**

```bash
cd apps/server
pnpm install
```

**2. 创建环境变量文件**

```bash
cp .env.example .env       # macOS / Linux
copy .env.example .env     # Windows PowerShell
```

打开 `.env`，按本机实际情况修改：

```dotenv
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=            # 本地 Redis 无密码可留空，留空则客户端不发 AUTH

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=nestdemo
MYSQL_SYNCHRONIZE=false    # 表结构由迁移管理，保持 false

JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=1800        # 访问令牌有效期（秒），1800 = 30 分钟
JWT_REFRESH_EXPIRES_IN=604800  # 刷新令牌有效期（秒），604800 = 7 天
```

环境变量按 `.env.${NODE_ENV}.local` → `.env.local` → `.env.${NODE_ENV}` → `.env` 的顺序加载，靠前优先，进程环境变量优先级最高；未设置 `NODE_ENV` 时按 `development` 读取。

**3. 初始化数据库**

在 `apps/server` 目录执行：

```bash
node scripts/init-db.mjs   # 等价于 pnpm db:init
```

脚本依次完成：创建数据库（utf8mb4 / utf8mb4_unicode_ci）→ 仓库里还没有迁移文件时，从实体生成 baseline 迁移 → 执行迁移建表 → 从 `resource/init.sql` 提取 `INSERT` 写入种子数据。

::::: warning 注意
- 目标库已有表时脚本会直接中止（非零退出码），这是保护机制，不是报错。
- 确认要删库重建才用 `node scripts/init-db.mjs --force`，不可撤销。
- 首次生成的 `src/database/migrations/<时间戳>-baseline.ts` 需要提交进仓库，否则换台机器初始化会再生成一份时间戳不同的基线。
- 只想看看要执行哪些动作，可加 `--dry-run`，不写库、不生成文件。
:::::

**4. 启动后端**

```bash
pnpm start:dev
```

后端默认端口 `3000`，接口前缀 `/api`，完整地址：`http://localhost:3000/api`。

### 初始化前端

前端依赖独立安装，进入前端工程目录：

```bash
cd apps/admin
pnpm install
pnpm dev
```

开发服务器默认端口 `7878`（`VITE_SERVER_PORT`），访问地址：`http://localhost:7878`。

::::: info 前端怎么请求后端？
`apps/admin/.env.development` 中预置了 `VITE_BASE_URL=http://localhost:3000` 和 `VITE_BASE_API=/dev-api/api`，Vite 会把 `/dev-api/api` 开头的请求转发到后端并去掉 `/dev-api` 前缀。你不需要改任何代码，也不用担心跨域问题。
:::::

### 登录系统

默认账号：

| 角色       | 用户名  | 密码      |
| ---------- | ------- | --------- |
| 超级管理员 | `admin` | `123456`  |

::::: danger ⚠️ 生产环境必须立即修改
以上密码仅用于本地体验。部署到服务器或公开环境前，务必修改默认密码。
:::::

## 生产部署

### 后端

方式一：Docker 交付（推荐）。仓库根目录执行 `node scripts/build-server-image.mjs`，脚本按 `config/docker/Dockerfile.server` 构建镜像并导出 `dist/nest-admin-template-server.tar`，目标机 `docker load` 后挂载 `.env` 启动即可。镜像内置健康探针、非 root 运行、`Asia/Shanghai` 时区与日志 / 上传目录卷，完整步骤与排错见 [生产部署](./deployment)。

方式二：手动部署。

```bash
cd apps/server
pnpm build       # 产物在 dist/
pnpm start:prod  # 或使用 pm2 等进程管理器守护
```

### 前端

```bash
cd apps/admin
pnpm install
pnpm build       # 先 vue-tsc 类型检查，再打包到 dist/
```

把 `dist` 交给 Nginx 托管，并将 `/api` 反向代理到后端：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /www/wwwroot/nestjs-admin/dist;
        try_files $uri $uri/ /index.html;   # history 路由模式需要
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

::::: info
生产构建时 `apps/admin/.env.production` 的 `VITE_BASE_API=/api` 会生效，前端直接请求同域 `/api`，由 Nginx 转发到后端，天然避免跨域。
:::::

## 环境变量速查

### 后端（apps/server/.env）

| 变量                     | 默认值        | 说明                             |
| ------------------------ | ------------- | -------------------------------- |
| `SERVER_PORT`            | `3000`        | 服务监听端口                     |
| `SERVER_GLOBAL_PREFIX`   | `/api`        | 全局接口路径前缀                 |
| `SERVER_IS_DEMO`         | `false`       | 是否演示环境                     |
| `REDIS_HOST`             | `127.0.0.1`   | Redis 地址                       |
| `REDIS_PORT`             | `6379`        | Redis 端口                       |
| `REDIS_PASSWORD`         | `redispwd`    | 示例占位值；实例无密码时必须留空 |
| `REDIS_DB`               | `0`           | Redis 数据库索引                 |
| `MYSQL_HOST`             | `127.0.0.1`   | MySQL 地址                       |
| `MYSQL_PORT`             | `3306`        | MySQL 端口                       |
| `MYSQL_USERNAME`         | `root`        | 数据库用户名，生产建议最小权限账号 |
| `MYSQL_PASSWORD`         | `aaadccc`     | 示例占位值，请替换为实际密码     |
| `MYSQL_DATABASE`         | `nestdemo`    | 数据库名称                       |
| `MYSQL_SYNCHRONIZE`      | `false`       | TypeORM 自动同步表结构，仅开发临时开启 |
| `JWT_SECRET`             | `your-secret-here` | 示例占位值，生产必须换成强随机值 |
| `JWT_EXPIRES_IN`         | `1800`        | 访问令牌有效期（秒）             |
| `JWT_REFRESH_EXPIRES_IN` | `604800`      | 刷新令牌有效期（秒），滑动续期   |

### 前端（apps/admin）

| 变量                     | 所在文件            | 默认值        | 说明                                       |
| ------------------------ | ------------------- | ------------- | ------------------------------------------ |
| `VITE_APP_TITLE`         | `.env`              | `NestJS Admin Template` | 应用标题                          |
| `VITE_OUTPUT_DIR`        | `.env`              | `dist`        | 打包输出目录                               |
| `VITE_PUBLIC_PATH`       | `.env`              | `/`           | 部署时的基本 URL                           |
| `VITE_ROUTER_MODE`       | `.env`              | `history`     | 路由模式                                   |
| `VITE_REQUEST_TIMEOUT`   | `.env`              | `0`           | 请求超时时间（秒），0 表示无超时           |
| `VITE_ROUTER_NPROGRESS`  | `.env`              | `true`        | 路由切换时是否显示顶部进度条               |
| `VITE_REQUEST_NPROGRESS` | `.env`              | `true`        | 请求接口时是否显示顶部进度条               |
| `VITE_STORAGE_PREFIX`    | `.env`              | `app:storage:` | 本地缓存统一键前缀                        |
| `VITE_SERVER_PORT`       | `.env.development`  | `7878`        | 开发服务器端口                             |
| `VITE_BASE_URL`          | `.env.development`  | `http://localhost:3000` | 开发环境代理目标地址             |
| `VITE_BASE_API`          | `.env.development`  | `/dev-api/api` | 开发环境接口公共路径                      |
| `VITE_BASE_API`          | `.env.production`   | `/api`        | 生产环境接口公共路径                       |
| `VITE_DROP_CONSOLE`      | `.env.production`   | `true`        | 生产构建移除 console                       |
| `VITE_DROP_DEBUGGER`     | `.env.production`   | `true`        | 生产构建移除 debugger                      |
