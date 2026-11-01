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

:::: tip 验证安装
在终端里依次执行以下命令，看到版本号就说明装好了：

```bash
node -v     # 应显示 v20.x.x 或更高
pnpm -v     # 应显示 10.x.x 或更高
```

::::

:::: tip 只想快速体验？
不需要手动安装 MySQL 和 Redis，使用下方的 **Docker 部署**即可，一切由 Docker Compose 自动编排。
::::

## Docker 部署

仓库根目录的 `docker-compose.yml` 会一键拉起三个服务：**NestJS 后端 + MySQL 8.4 + Redis 7.4**（MySQL 首次启动自动导入 `init.sql` 建表与种子数据）。

### 安装 Docker

如果还没装 Docker，到 [docker.com](https://www.docker.com/products/docker-desktop/) 下载 Docker Desktop 并安装。

:::: warning Windows 注意
Windows 用户安装 Docker Desktop 后，需要确保 WSL2 已启用。安装程序通常会自动处理，完成后重启电脑即可。
::::

### 获取项目

打开终端（Windows 用户打开 PowerShell），执行：

```bash
git clone https://gitee.com/decade9527/nestjs-admin-template.git
cd nestjs-admin-template
```

### 配置环境变量

在**仓库根目录**新建 `.env` 文件，至少写入以下两项：

```dotenv
MYSQL_PASSWORD=your-strong-password
JWT_SECRET=your-random-secret
```

- `MYSQL_PASSWORD` —— MySQL root 密码，同时供后端连接使用
- `JWT_SECRET` —— JWT 签名密钥，务必使用强随机值

### 一键启动

```bash
docker compose up -d --build
```

首次执行会自动下载镜像、安装依赖、构建项目，大约需要 3~5 分钟。启动完成后：

| 服务        | 地址                        | 说明                           |
| ----------- | --------------------------- | ------------------------------ |
| 后端接口    | `http://localhost:3000/api` | NestJS 服务，含 `/api/uploads` 静态资源 |
| MySQL       | 容器网内 3306               | 默认不映射宿主机端口           |
| Redis       | 容器网内 6379               | 默认不映射宿主机端口           |

:::: info 前端怎么部署？
`docker-compose.yml` 只编排了后端与中间件。前端 `apps/admin/` 需要 `pnpm build` 后将 `dist` 目录交给 Nginx 托管，并把 `/api` 反向代理到后端 `3000` 端口，详见下文「生产部署」。
::::

### 遇到问题怎么办？

```bash
# 查看各服务运行状态（healthy 为正常）
docker compose ps

# 查看后端日志（启动失败时很有用）
docker compose logs server -f

# 重启所有服务
docker compose restart

# 完全重置（清除数据库和 Redis 数据卷，下次 up 重新导入 init.sql）
docker compose down -v
```

## 源码部署

需要写代码、频繁修改时用这个模式。前后端分开跑，各自支持热更新。

### 初始化后端

**1. 安装依赖**

本模板是 pnpm workspace monorepo，在**仓库根目录**执行一次安装即可同时装好前后端依赖：

```bash
pnpm install
```

**2. 创建环境变量文件**

进入后端工程目录，复制环境变量模板：

```bash
cd apps/server
cp .env.example .env       # macOS / Linux
copy .env.example .env     # Windows PowerShell
```

然后打开 `.env` 文件，按你本机的实际值修改：

```dotenv
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=            # 本地 Redis 无密码可留空

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=nestdemo
MYSQL_SYNCHRONIZE=false    # 生产环境必须保持 false

JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=1800        # 令牌有效期（秒），1800 = 30 分钟
```

**3. 初始化数据库**

`init.sql` 在仓库根目录，包含建表语句（自带 `DROP TABLE IF EXISTS`）与种子数据。执行项目自带的脚本，它会自动创建数据库（`nestdemo`，utf8mb4）并导入：

```bash
pnpm db:init
```

:::: danger 注意
`init.sql` 自带 `DROP TABLE IF EXISTS`，导入会清空同名表。已有数据时务必先备份。
::::

**4. 启动后端**

```bash
pnpm start:dev
```

后端默认端口 `3000`，接口前缀 `/api`，完整地址：`http://localhost:3000/api`。

### 初始化前端

依赖已在根目录统一安装，进入前端工程目录直接启动即可：

```bash
cd apps/admin
pnpm dev
```

前端默认端口 `5173`，访问地址：`http://localhost:5173`。

:::: info 前端怎么请求后端？
`apps/admin/.env.development` 中预置了 `VITE_BASE_URL=http://localhost:3000` 和 `VITE_BASE_API=/dev-api/api`，Vite 会自动把 `/dev-api/api` 开头的请求代理转发到后端。你不需要改任何代码，也不用担心跨域问题。
::::

### 登录系统

默认账号：

| 角色       | 用户名  | 密码      |
| ---------- | ------- | --------- |
| 超级管理员 | `admin` | `123456`  |

:::: danger ⚠️ 生产环境必须立即修改
以上密码仅用于本地体验。部署到服务器或公开环境前，务必修改默认密码。
::::

## 生产部署

### 后端

方式一：Docker 交付（推荐）。仓库根目录的 `Dockerfile.server` 已配好三阶段构建、健康探针（`/api/monitor/health/live`）、非 root 运行与 `Asia/Shanghai` 时区，配合 `docker-compose.yml` 直接使用。

方式二：手动部署。

```bash
cd apps/server
pnpm build       # 产物在 dist/
pnpm start:prod  # 或使用 pm2 等进程管理器守护
```

### 前端

```bash
cd apps/admin
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

:::: info
生产构建时 `apps/admin/.env.production` 的 `VITE_BASE_API=/api` 会生效，前端直接请求同域 `/api`，由 Nginx 转发到后端，天然避免跨域。
::::

## 环境变量速查

### 后端（apps/server/.env）

| 变量                 | 默认值        | 说明                             |
| -------------------- | ------------- | -------------------------------- |
| `SERVER_PORT`        | `3000`        | 服务监听端口                     |
| `SERVER_GLOBAL_PREFIX` | `/api`      | 全局接口路径前缀                 |
| `SERVER_IS_DEMO`     | `false`       | 是否演示环境                     |
| `REDIS_HOST`         | `127.0.0.1`   | Redis 地址                       |
| `REDIS_PORT`         | `6379`        | Redis 端口                       |
| `REDIS_PASSWORD`     | 留空          | Redis 密码，留空则不传密码       |
| `REDIS_DB`           | `0`           | Redis 数据库索引                 |
| `MYSQL_HOST`         | `127.0.0.1`   | MySQL 地址                       |
| `MYSQL_PORT`         | `3306`        | MySQL 端口                       |
| `MYSQL_USERNAME`     | `root`        | 数据库用户名                     |
| `MYSQL_PASSWORD`     | —             | 数据库密码                       |
| `MYSQL_DATABASE`     | `nestdemo`    | 数据库名称                       |
| `MYSQL_SYNCHRONIZE`  | `false`       | TypeORM 自动同步表结构，生产必须 `false` |
| `JWT_SECRET`         | —             | JWT 签名密钥                     |
| `JWT_EXPIRES_IN`     | `1800`        | 访问令牌有效期（秒）             |
| `JWT_REFRESH_EXPIRES_IN` | `604800`  | 刷新令牌有效期（秒），604800 = 7 天 |

### 前端（apps/admin/.env）

| 变量                     | 默认值    | 说明                                       |
| ------------------------ | --------- | ------------------------------------------ |
| `VITE_APP_TITLE`         | —         | 应用标题                                   |
| `VITE_PUBLIC_PATH`       | `/`       | 部署时的基本 URL                           |
| `VITE_OUTPUT_DIR`        | `dist`    | 打包输出目录                               |
| `VITE_ROUTER_MODE`       | `history` | 路由模式                                   |
| `VITE_SERVER_PORT`       | `5173`    | 开发服务器端口                             |
| `VITE_BASE_URL`          | —         | 后端接口代理地址（开发环境）               |
| `VITE_BASE_API`          | —         | 后端接口公共路径                           |
| `VITE_REQUEST_TIMEOUT`   | `0`       | 请求超时时间（秒），0 表示无超时           |
| `VITE_DROP_CONSOLE`      | `true`    | 生产构建移除 console                       |
| `VITE_DROP_DEBUGGER`     | `true`    | 生产构建移除 debugger                      |
