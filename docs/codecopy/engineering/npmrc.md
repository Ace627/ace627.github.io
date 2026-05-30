# npmrc 配置参考

> 汇总项目开发中常用的 `.npmrc` 配置项，涵盖镜像源、依赖锁定、运行时校验与包行为控制，帮助团队统一 pnpm 工程化规范。更多配置详见 [pnpm 官方文档](https://www.pnpm.cn/npmrc)。

## 一、镜像源配置

加速依赖下载，统一使用国内镜像源，避免因网络问题导致安装失败。

### 1.1 npm 默认镜像源

```bash
registry = https://registry.npmmirror.com
```

将 npm 默认源指向淘宝镜像，提升包下载速度和稳定性。

### 1.2 Electron 相关镜像源

```bash
electron_mirror = https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror = https://npmmirror.com/mirrors/electron-builder-binaries/
```

当项目依赖 Electron 时，这两项配置可避免从 GitHub Releases 下载二进制包失败的问题。

## 二、依赖管理配置

控制依赖安装行为，确保团队协作中依赖版本的一致性。

### 2.1 锁定文件

```bash
lockfile = true
```

开启 `pnpm-lock.yaml` 的生成与校验，锁定依赖树确保 CI / 团队成员安装的依赖完全一致。

### 2.2 精确版本匹配

```bash
save-exact = true
```

安装依赖时自动写入精确版本号（如 `1.2.3` 而非 `^1.2.3`），避免 semver 自动升级引入的兼容性问题。

### 2.3 拉取重试次数

```bash
fetch-retries = 2
```

从 registry 拉取失败时的重试次数，2 次是兼顾可靠性与等待时长的推荐值。

## 三、运行时校验配置

在安装和运行阶段进行环境校验，提前暴露版本不匹配问题。

### 3.1 Node 版本校验

```bash
engine-strict = false
```

当本地 Node 版本与 `package.json` 中 `engines` 字段不一致时，是否中断命令执行。设为 `false` 可放宽校验，避免因小版本差异阻断开发流程。

### 3.2 包管理器版本校验

```bash
package-manager-strict = false
```

当本地 pnpm 版本与 `package.json` 中 `packageManager` 字段不符时，是否中断命令执行。设为 `false` 可规避 `pnpm dev` 因版本差异报错的问题（[参考](https://blog.csdn.net/weixin_45487909/article/details/139463251)）。

## 四、Node 包行为配置

控制 pnpm 对 Node 包生命周期和依赖树的处理方式。

### 4.1 生命周期钩子

```bash
enable-pre-post-scripts = true
```

开启后将执行 `preinstall`、`postinstall` 等生命周期脚本，使 pnpm 能够触发用户自定义的构建钩子。

### 4.2 依赖提升策略

```bash
shamefully-hoist = true
```

将依赖扁平提升至根 `node_modules`，解决部分组件因路径差异导致类型提示缺失的问题。

## 五、完整配置速览

以下为上述全部配置的汇总，可直接拷贝至项目根目录的 `.npmrc` 文件中使用：

```bash
# 更多配置：https://www.pnpm.cn/npmrc

# 配置 npm 的默认镜像源为淘宝镜像源
registry = https://registry.npmmirror.com

# 配置 Electron 相关的国内镜像源
electron_mirror = https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror = https://npmmirror.com/mirrors/electron-builder-binaries/

# 当设置为 false 时，pnpm 不会读取或生成 pnpm-lock.yaml 文件
lockfile = true

# 如果 pnpm 无法从registry中获取，重试次数
fetch-retries = 2

# 确保项目中的依赖包版本与 package.json 文件中的版本精确匹配
save-exact = true

# node 版本与 package.json 配置不同的时候，中断命令执行
engine-strict = false

# 开启 node 包执行的钩子 使 pnpm 可以执行用户定义的 hook
enable-pre-post-scripts = true

# 通过该配置兜底解决组件没有类型提示的问题
shamefully-hoist = true

# 解决 pnpm dev 时报错本地 pnpm 版本过高和 package.json 不符的问题
# https://blog.csdn.net/weixin_45487909/article/details/139463251
package-manager-strict = false
```

### 核心总结

本文梳理了项目开发中常用的 `.npmrc` 配置项，核心思路是：**镜像源保障下载速度、精确版本锁定保证一致性、放宽运行时校验提升兼容性、依赖提升兜底解决类型提示问题**。团队成员按此配置可快速统一工程化环境。
