# 常用脚本

仓库里的脚本统一用 Node ESM（`.mjs`）编写，不需要额外安装依赖，`node` 直接运行。

| 脚本 | 位置 | 作用 |
| --- | --- | --- |
| `build-server-image.mjs` | 仓库根 `scripts/` | 构建后端生产镜像并导出离线 tar |
| `generate-init-sql.mjs` | 仓库根 `scripts/` | 连接开发库，重新生成 `resource/init.sql` |
| `clean-svg-icons.mjs` | 仓库根 `scripts/` | 清理 SVG 图标冗余属性 |
| `init-db.mjs` | `apps/server/scripts/` | 数据库一键初始化 |
| `healthcheck.js` | `apps/server/scripts/` | 容器健康探针（镜像内使用） |

## 构建后端镜像

```bash
node scripts/build-server-image.mjs
```

在仓库根目录执行，流程：清理旧产物 → 按 `config/docker/Dockerfile.server` 构建镜像 → `docker save` 导出 `dist/nest-admin-template-server.tar` → 删除本地镜像（导出成功后不在镜像列表留存）。

镜像名、tar 路径与 Dockerfile 路径都在脚本顶部的 `config` 常量里修改。需要离线包以外的场景，可直接构建：

```bash
docker build -f config/docker/Dockerfile.server -t nest-admin-server:latest .
```

::::: tip
构建上下文是仓库根，所以 `.dockerignore` 必须留在仓库根才生效；脚本会先探测 Docker 守护进程，未启动时给出明确提示。
:::::

完整的上线步骤见 [生产部署](./deployment)。

## 生成 init.sql

```bash
node scripts/generate-init-sql.mjs
```

连接 `apps/server/.env` 中配置的开发库，导出全部业务的 `INSERT` 数据并覆盖 `resource/init.sql`（进程环境变量优先于 env 文件）。脚本会跳过迁移记录表 `sys_migrations` 与操作 / 登录 / 任务日志表，避免种子数据把运行日志一起带进去。

::::: warning
导出结果是开发库的完整快照（含建表语句与 `INSERT`），但初始化流程只提取其中的 `INSERT` 作为种子数据，建表仍以迁移为准，不要手工执行整份文件。重新生成后，在 `apps/server` 下执行 `pnpm db:init` 初始化空库即可。
:::::

## 清理 SVG 图标

```bash
node scripts/clean-svg-icons.mjs
```

移除 `apps/admin/src/assets/svg-icons` 下 SVG 的 `fill` / `width` / `height` 等属性并压缩体积，让图标颜色能跟随 `currentColor`。默认目录即上述路径，也可传入自定义目录。新增图标的完整流程见 [图标使用](./svg-icon)。

## 初始化数据库

在 `apps/server` 目录执行：

```bash
node scripts/init-db.mjs            # 等价于 pnpm db:init
node scripts/init-db.mjs --dry-run  # 只打印将要执行的动作
node scripts/init-db.mjs --force    # 删库重建（不可撤销）
```

建库 → 无迁移文件时生成 baseline 迁移 → `migration:run` 建表 → 从 `resource/init.sql` 写入种子数据。目标库已有表时会中止执行，属保护机制。详见 [环境部署](./quick-start#初始化后端)。

## 前端单元测试

```bash
cd apps/admin
pnpm test       # vitest 监听模式
pnpm test:run   # 单次执行
```

测试配置在 `apps/admin/vitest.config.ts`，只加载 `test/**/*.spec.ts`，运行环境为 `node`，不加载业务构建插件。新增用例时按 `src` 目录结构在 `test/` 下建同名文件即可。

## 服务器备份 Docker 数据库

宝塔的计划任务，每天 `02:00` 执行一下就行：

```bash
#!/bin/bash
# MySQL 数据库定时备份脚本
# 通过 docker exec 进入容器执行 mysqldump，无需项目文件或 .env
set -euo pipefail

# ==================== 配置项 ====================
MYSQL_CONTAINER="nest-admin-mysql"                     # MySQL 容器名称
MYSQL_USER="root"                                      # 数据库用户（容器内 MYSQL_ROOT_PASSWORD 环境变量提供密码）
COMPRESS="false"                                       # 是否压缩备份（true 生成 .sql.gz）
BACKUP_DIR="/www/backup/nest-admin"                    # 备份文件存放目录
CLEAN_OLD_BACKUPS="true"                               # 是否自动清理旧备份
RETENTION_DAYS="7"                                     # 保留最近 N 天的备份

# ==================== 备份逻辑 ====================
TIMESTAMP=$(date +%Y%m%d%H%M%S)

mkdir -p "${BACKUP_DIR}"

# 密码通过 MYSQL_PWD 环境变量传入，避免命令行暴露
# MYSQL_ROOT_PASSWORD 和 MYSQL_DATABASE 来自容器的环境变量，无需外部配置
if [ "${COMPRESS}" = "true" ]; then
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
    docker exec "${MYSQL_CONTAINER}" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction -u '"${MYSQL_USER}"' "$MYSQL_DATABASE"' | gzip > "${BACKUP_FILE}"
else
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
    docker exec "${MYSQL_CONTAINER}" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction -u '"${MYSQL_USER}"' "$MYSQL_DATABASE"' > "${BACKUP_FILE}"
fi

# 校验备份文件是否有效
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "备份失败"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

echo "OK: ${BACKUP_FILE}"

# 清理过期备份
if [ "${CLEAN_OLD_BACKUPS}" = "true" ]; then
    find "${BACKUP_DIR}" -name "backup_*.sql*" -type f -mtime "+${RETENTION_DAYS}" -delete
fi
```
