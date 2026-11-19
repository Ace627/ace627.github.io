# 生产部署

本地跑通之后，上线通常分两块：后端以 Docker 镜像交付，前端构建成静态文件交给 Nginx。后端镜像里只有 NestJS 服务（`node main.js`），不包含前端产物，也不包含源码与 TypeORM CLI，因此数据库初始化要在开发机或 CI 上完成，再连接目标库。

> 下文假设目标机已有可用的 MySQL 与 Redis，并且构建机已安装 Docker Desktop（或有可用的 Docker 守护进程）。

## 后端镜像部署

### 1. 初始化数据库

初始化脚本要读 `apps/server` 的 env 文件、用 `esno` 跑 TypeORM CLI，所以必须**在装好依赖的机器上执行**，不要进容器跑：

```bash
cd apps/server
pnpm install                        # 首次或依赖有变动时
node scripts/init-db.mjs            # 等价于 pnpm db:init
node scripts/init-db.mjs --dry-run  # 只打印将要执行的动作，不写库、不生成文件
```

执行顺序：建库（utf8mb4 / utf8mb4_unicode_ci）→ 仓库里还没有迁移文件时从实体生成 baseline 迁移 → `migration:run` 建表 → 从 `resource/init.sql` 提取 `INSERT` 写入种子数据。

- 目标库已有表会直接中止（非零退出码），这是保护机制。
- 确认要删库重建才用 `node scripts/init-db.mjs --force`，不可撤销。
- 首次生成的 `src/database/migrations/<时间戳>-baseline.ts` 必须提交进仓库，否则换台机器初始化会再生成一份时间戳不同的基线。
- 初始化完成会打印默认账号 `admin / 123456`。

### 2. 准备运行时环境变量

在**仓库根目录**新建 `.env`（与 `apps/server/.env` 是两份；`.dockerignore` 已排除全部 `.env`，不会被打进镜像）：

```dotenv
SERVER_PORT=3000                 # 容器监听端口，改这里要和 -p 的容器端口一起改
SERVER_GLOBAL_PREFIX=/api        # 全局前缀；改掉后容器健康探针会失效
SERVER_IS_DEMO=false             # 生产保持 false；true 会拦截所有非 GET 请求

MYSQL_HOST=192.168.1.10          # 容器能访问到的 MySQL 地址，不能写 127.0.0.1
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=your-strong-password
MYSQL_DATABASE=nestdemo
MYSQL_SYNCHRONIZE=false          # 表结构只走迁移

REDIS_HOST=192.168.1.10          # 同上，不能写 127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=                  # 实例无密码时必须留空，否则客户端会发 AUTH 触发 NOAUTH
REDIS_DB=0

JWT_SECRET=your-random-secret
JWT_EXPIRES_IN=1800              # 访问令牌，秒
JWT_REFRESH_EXPIRES_IN=604800    # 刷新令牌，秒，滑动续期
```

::::: warning 容器里的 127.0.0.1
容器内的 `127.0.0.1` 指容器自己，连宿主机的服务必须写真实 IP 或 `host.docker.internal`（Linux 上需额外 `--add-host`）。镜像内没有 env 文件，配置只来自启动时的 `--env-file` / `-e`，改完重启容器才生效。
:::::

变量含义与默认值见 `apps/server/.env.example`，读取逻辑在 `apps/server/src/configuration.ts`。

### 3. 构建并导出镜像

在能联网、已启动 Docker 的机器上，仓库根目录执行：

```bash
node scripts/build-server-image.mjs
```

产物是 `dist/nest-admin-template-server.tar`：脚本先清旧 tar，构建镜像，`docker save` 导出，成功后再删掉本地镜像（不在 Docker 镜像列表留存）。镜像名、tar 路径、Dockerfile 都在脚本顶部的 `config` 常量里改。

不需要离线包时也可以直接构建：

```bash
docker build -f config/docker/Dockerfile.server -t nest-admin-server:latest .
```

- 构建上下文是仓库根，`.dockerignore` 必须留在仓库根才生效；`**/node_modules`、`**/dist`、`**/logs`、`**/uploads`、`**/.env` 都不进镜像。
- 运行时基线固定为 `node:24.18.0-alpine` + `pnpm@12.18.0`（Dockerfile 顶部 `ARG`），依赖走 npmmirror。
- 构建时会剥离 rspack 的 ANSI 颜色码，容器内非 TTY 也不会刷出乱码日志。

### 4. 导入并启动

把 `nest-admin-template-server.tar` 和 `.env` 拷到目标机同一目录：

```bash
docker load -i nest-admin-template-server.tar

docker run -d --name nest-admin-server --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v nest-admin-uploads:/app/uploads \
  -v nest-admin-logs:/app/logs \
  nest-admin-server:latest
```

镜像内的关键约定：

- 以非 root 用户 `node`（uid 1000）运行，工作目录 `/app`，入口 `node main.js`（exec 形式，配合 `enableShutdownHooks()` 收 SIGTERM 优雅退出）。
- 时区固定 `TZ=Asia/Shanghai` + `/etc/localtime` 软链，日志文件名、dayjs、BullMQ cron 都依赖它。
- 日志写在 `/app/logs/info`、`/app/logs/error`（winston 按天切分）；上传文件在 `/app/uploads`，对外通过 `/api/uploads/<文件名>` 访问。两个目录都相对 `process.cwd()`，卷必须挂到 `/app` 下。
- 两个命名卷保存上传文件与日志，`docker rm` 重建容器后数据仍在。新卷首次挂载时 Docker 会把镜像里目录的属主（uid 1000）一并带进来，宿主机无需授权。

想直接在宿主机查看或备份这两个目录，可改用绑定目录，但要先让 uid 1000 可写：

```bash
mkdir -p ./data/uploads ./data/logs
sudo chown -R 1000:1000 ./data/uploads ./data/logs
# 启动参数换成：-v "$PWD/data/uploads:/app/uploads" -v "$PWD/data/logs:/app/logs"
```

### 5. 验证

```bash
docker ps                                              # 状态应为 healthy
docker logs -f nest-admin-server                       # 看启动日志
curl http://127.0.0.1:3000/api/monitor/health/live     # {"status":"ok",...}
curl http://127.0.0.1:3000/api/monitor/health/ready
```

`live` / `ready` 都是 `@Public()` 且不依赖 DB / Redis，不会因依赖抖动误报；需要连库体检时用 `/api/monitor/health/database`（需登录）。接口正常后用默认账号 `admin / 123456` 登录并立即修改密码。

### 6. 更新版本

```bash
docker rm -f nest-admin-server
docker load -i nest-admin-template-server.tar
docker run -d --name nest-admin-server --restart unless-stopped \
  -p 3000:3000 --env-file .env \
  -v nest-admin-uploads:/app/uploads \
  -v nest-admin-logs:/app/logs \
  nest-admin-server:latest
```

- 卷名必须和上次一致，否则新容器会挂到空卷上，看起来像「数据丢了」。
- 同一 tag 反复 `docker load` 会留下悬空旧镜像，可用 `docker image prune` 清理。
- 新版本含表结构变更时，先在能联网、具备完整依赖的机器上对目标库执行 `pnpm migration:run`，再切换容器；`init-db.mjs` 只用于空库首装，不能当升级工具。

## 前端部署

```bash
cd apps/admin
pnpm install
pnpm build
```

`pnpm build` 先跑 `vue-tsc -b` 类型检查，再打包到 `dist/`。把 `dist` 交给 Nginx，并把 `/api` 反向代理到后端，详见[环境部署](./quick-start#前端)中的 Nginx 配置片段。

生产环境的接口公共路径由 `apps/admin/.env.production` 的 `VITE_BASE_API=/api` 决定，与后端 `SERVER_GLOBAL_PREFIX` 保持一致即可。

## 表结构变更

建表与改表统一由迁移管理，`MYSQL_SYNCHRONIZE` 保持 `false`（在 `apps/server` 下执行）：

```bash
pnpm typeorm migration:generate src/database/migrations/<改动名>  # 对比实体与当前库，生成增量迁移
pnpm migration:run      # 执行待跑迁移
pnpm typeorm migration:show   # 查看已执行 / 待执行
pnpm migration:revert         # 回滚最后一条，依赖 down() 写对
```

::::: tip
`init-db.mjs` 只在空库首装时使用；已上线的库新增表或改字段，请走上面的增量迁移流程。
:::::

## 常见问题

| 现象                                                 | 原因                                                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 启动后连不上 MySQL / Redis                           | `.env` 里写了 `127.0.0.1`，或目标机防火墙没放通 3306 / 6379；Linux 上连宿主机服务需用真实 IP 或 `--add-host=host.docker.internal:host-gateway` |
| Redis 报 NOAUTH                                      | `REDIS_PASSWORD` 与实际实例不一致；实例无密码时必须留空，留空时客户端不发 AUTH                                                                 |
| 启动报找不到表 / 表结构不对                          | 目标库没有执行过初始化或迁移；`init-db.mjs` 只用于空库首装，升级走 `pnpm migration:run`                                                        |
| 在容器里跑 `init-db.mjs` 报找不到 esno / TypeORM CLI | 镜像只有生产依赖、没有源码，初始化必须在开发机或 CI 上对目标库执行                                                                             |
| 导入镜像后启动失败（exec format error）              | 构建机与目标机 CPU 架构不同，需在同架构机器上构建                                                                                              |
| 改了 `SERVER_PORT` 后访问不到                        | `-p 宿主端口:容器端口` 与 `.env` 里的 `SERVER_PORT` 要一起改；探针跟随 `SERVER_PORT`，端口不一致会直接 unhealthy                               |
| 改了 `SERVER_GLOBAL_PREFIX` 后一直 unhealthy         | 探针路径在 `apps/server/scripts/healthcheck.js` 里写死为 `/api/monitor/health/live`，改了前缀需同步改脚本再重建镜像                            |
| 日志 / 上传文件随容器删除丢失                        | 启动时漏了 `-v nest-admin-uploads:/app/uploads`、`-v nest-admin-logs:/app/logs`，或换了卷名                                                    |
| 绑定目录启动后报 EACCES                              | 宿主机目录属主不是 uid 1000，先 `chown -R 1000:1000`（Linux 只认数字，宿主没有 `node` 用户也一样）                                             |
