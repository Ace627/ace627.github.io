# 快速上手

本文为纯新手准备，从零开始带你跑起云禾。无论你用的是 Windows、macOS 还是 Linux，只要跟着步骤走，几分钟内就能在浏览器里看到系统。

## 环境准备

启动云禾之前，你的电脑需要装好以下工具。如果某项还没装，点击链接去官网下载安装即可。

| 工具    | 最低版本 | 作用                      | 安装指引                                |
| ------- | -------- | ------------------------- | --------------------------------------- |
| Node.js | ≥ 22.x   | JavaScript 运行时         | [nodejs.org](https://nodejs.org)        |
| pnpm    | ≥ 10.x   | 包管理器（比 npm 快得多） | [pnpm.io](https://pnpm.io/installation) |

::: tip 验证安装
在终端里依次执行以下命令，看到版本号就说明装好了：

```bash
node -v     # 应显示 v22.x.x 或更高
pnpm -v    # 应显示 10.x.x 或更高
```

:::

## 启动方式

云禾提供两种运行模式，按你的需求选一种即可：

| 方式            | 适合谁           | 前置条件            | 特点                         |
| --------------- | ---------------- | ------------------- | ---------------------------- |
| Docker 一键启动 | 新手、快速体验   | 装好 Docker         | 全部自动配好，五分钟跑起来   |
| 独立开发模式    | 写代码、要热更新 | 本地 MySQL 和 Redis | 前后端分开跑，改代码即时生效 |

---

## Docker 启动

不需要手动安装 MySQL、Redis，一切由 Docker Compose 自动编排。

### 安装 Docker

如果还没装 Docker，到 [docker.com](https://www.docker.com/products/docker-desktop/) 下载 Docker Desktop 并安装。

::: warning Windows 注意
Windows 用户安装 Docker Desktop 后，需要确保 WSL2 已启用。安装程序通常会自动处理，完成后重启电脑即可。
:::

### 克隆项目

打开终端（Windows 用户打开 PowerShell），执行：

```bash
git clone https://github.com/Ace627/YunHe-Vue.git
cd YunHe-Vue
```

### 配置环境变量

项目根目录下有一个 `.env.example` 示例文件，把它复制一份命名为 `.env`：

```bash
cp .env.example .env        # macOS / Linux
copy .env.example .env      # Windows PowerShell
```

然后打开 `.env` 文件，至少修改以下两项（安全起见）：

- `MYSQL_PASSWORD` —— 把默认密码改掉
- `REDIS_PASSWORD` —— 把默认密码改掉

其他配置项暂时不用动。

### 一键启动

```bash
pnpm docker:up
```

首次执行会自动下载镜像、安装依赖、构建项目，大约需要 3~5 分钟。看到控制台输出稳定无报错后，打开浏览器：

| 地址                      | 说明     |
| ------------------------- | -------- |
| `http://localhost:80`     | 前端页面 |
| `http://localhost:80/api` | 后端接口 |

### 登录系统

默认账号：

| 角色       | 用户名  | 密码          |
| ---------- | ------- | ------------- |
| 超级管理员 | `admin` | `admin123456` |

::: danger ⚠️ 生产环境必须立即修改
以上密码仅用于本地体验。部署到服务器或公开环境前，务必修改默认密码。
:::

### 遇到问题怎么办？

```bash
# 查看各服务运行状态
docker compose ps

# 查看后端日志（启动失败时很有用）
docker compose logs server -f

# 重启所有服务
pnpm docker:restart

# 完全重置（清除数据库和 Redis 数据，回到初始状态）
pnpm docker:reset
```

---

## 独立开发

需要写代码、频繁修改时用这个模式。前后端分开跑，各自支持热更新。

### 前置条件

确保本机已安装并启动 MySQL 8.0+ 和 Redis 7+，并且已创建数据库：

```sql
CREATE DATABASE yunhe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

然后把 `database/init.sql` 导入到 `yunhe` 数据库中。

### 后端启动

**创建本地配置文件**

```bash
cp apps/server/config/config.yaml apps/server/config/config.local.yaml
```

**编辑 config.local.yaml**

把以下配置项改成你本机的实际值：

```yaml
database:
  host: 127.0.0.1 # 你的 MySQL IP
  password: 你的MySQL密码
  synchronize: false # ⚠️ 这个必须保持 false，不要改

redis:
  host: 127.0.0.1 # 你的 Redis IP
  password: 你的Redis密码
```

**启动后端**

```bash
pnpm dev:server
```

后端默认端口 `3000`，接口前缀 `/api`，完整地址：`http://localhost:3000/api`。

### 前端启动

在项目根目录打开另一个终端窗口：

```bash
pnpm dev:admin
```

前端默认端口 `5173`，访问地址：`http://localhost:5173`。

::: info 前端怎么请求后端？
`.env.development` 中预置了 `VITE_BASE_URL=http://localhost:3000` 和 `VITE_BASE_API=/dev-api/api`，Vite 会自动把 `/dev-api/api` 开头的请求代理转发到后端。你不需要改任何代码，也不用担心跨域问题。
:::

---

## 根目录常用命令速查

| 命令                  | 用途                         | 场景           |
| --------------------- | ---------------------------- | -------------- |
| `pnpm install`        | 安装所有依赖                 | 首次克隆项目后 |
| `pnpm dev:server`     | 启动后端开发服务器（热更新） | 独立开发模式   |
| `pnpm dev:admin`      | 启动前端开发服务器（HMR）    | 独立开发模式   |
| `pnpm build:server`   | 构建后端生产包               | 手动部署       |
| `pnpm build:admin`    | 构建前端生产包               | 手动部署       |
| `pnpm docker:up`      | Docker 一键启动所有服务      | 容器化部署     |
| `pnpm docker:down`    | 停止并移除所有容器           | 停止服务       |
| `pnpm docker:restart` | 重启所有服务                 | 更新代码后重启 |
| `pnpm docker:reset`   | 重置数据并重启（删除数据卷） | 完全重置       |
