# 常用脚本

## 本地构建镜像并推送至私有仓库

需要提前搭建好私有 Docker 仓库，例如 Docker Registry

```bash
#!/bin/bash
set -e

REGISTRY_IP="172.17.16.48:5000"
RETRY_MAX=32  # 最多重试 32 次
RETRY_DELAY=5  # 每次重试间隔 5 秒
CLEANUP_ENABLED=true  # 推送完成后是否清除无用镜像（dangling images）

GREEN="\033[32m"
NC="\033[0m"

# 重试函数（核心！）
retry_push() {
  local image=$1
  local count=1
  while [ $count -le $RETRY_MAX ]; do
    echo -e "${GREEN}📤 推送第 $count 次: $image${NC}"
    if docker push $image; then
      echo -e "${GREEN}✅ 推送成功！${NC}"
      return 0
    else
      echo -e "❌ 推送失败（第 $count 次），${RETRY_DELAY}秒后重试..."
      sleep $RETRY_DELAY
      ((count++))
    fi
  done
  echo -e "💥 超过最大重试次数，推送失败！"
  return 1
}

echo -e "${GREEN}🚀 构建镜像...${NC}"
# DOCKER_BUILDKIT=0 docker-compose build server admin
docker-compose build server admin

echo -e "${GREEN}🏷 打标签...${NC}"
docker tag yunhe-vue/server:latest ${REGISTRY_IP}/yunhe-vue/server:latest
docker tag yunhe-vue/admin:latest ${REGISTRY_IP}/yunhe-vue/admin:latest

echo -e "${GREEN}📤 开始推送 server 镜像...${NC}"
retry_push "${REGISTRY_IP}/yunhe-vue/server:latest"

sleep 5  # 间隔 5 秒，给网络喘息时间

echo -e "${GREEN}📤 开始推送 admin 镜像...${NC}"
retry_push "${REGISTRY_IP}/yunhe-vue/admin:latest"

echo -e "${GREEN}🎉 全部推送完成！宝塔直接部署！${NC}"

if [ "$CLEANUP_ENABLED" = "true" ]; then
  echo -e "${GREEN}🧹 清除无用镜像...${NC}"
  docker image prune -f
  echo -e "${GREEN}✅ 清除完成${NC}"
fi
```

## 服务器备份 Docker 数据库

宝塔的计划任务，每天 `02:00` 执行一下就行了

```bash
#!/bin/bash
# MySQL 数据库定时备份脚本
# 通过 docker exec 进入容器执行 mysqldump，无需项目文件或 .env
set -euo pipefail

# ==================== 配置项 ====================
MYSQL_CONTAINER="mysql"                                # MySQL 容器名称
MYSQL_USER="root"                                      # 数据库用户（容器内 MYSQL_ROOT_PASSWORD 环境变量提供密码）
COMPRESS="false"                                       # 是否压缩备份（true 生成 .sql.gz）
BACKUP_DIR="/www/wwwroot/smart-mfg-biweekly-pms/backups" # 备份文件存放目录
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
