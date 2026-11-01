# 高德地图 JS API 教程

## 写在前面

本教程讲解**高德地图（AMap JS API 2.0）在 Vue 3 中的使用**，从申请 Key、画出第一张地图，到标记、搜索、定位轨迹，再到工程化封装与性能优化。全系列基于 JS API 2.0 + `@amap/amap-jsapi-loader` + Vue 3 组合式 API（`<script setup lang="ts">`），示例均为 TypeScript。

## 高德地图 JS API 是什么？

高德地图 JS API 是高德开放平台提供的浏览器端 JavaScript 开发套件。它让你在网页里嵌入一张可交互的地图，并通过各种插件扩展搜索、定位、出行等能力。

## 能干什么？

- **地图展示**：加载地图、切换样式、缩放平移、加工具条等控件；
- **标记与覆盖物**：放标记点、点击弹出信息卡片、画圆和电子围栏（高德把点、线、面这类「画在地图上的东西」统称**覆盖物**）；
- **搜索与地理编码**：搜周边门店（POI 搜索）、输入框联想、地址和经纬度互相翻译（地理编码）、路线规划；
- **定位与轨迹**：浏览器定位、轨迹回放、实时跟随；
- **工程化与性能**：组合式函数封装、点聚合、图层叠加、实时数据推送。

## 申请 Key 和安全密钥

使用 JS API 前需要先申请一个 Key：

1. 前往[高德开放平台](https://lbs.amap.com/)注册并实名认证（个人开发者即可）。
2. 进入「应用管理」→「创建新应用」→「添加 Key」。
3. **服务平台一定要选「Web端(JS API)」**，别选成「Web服务」——后者是给后端 HTTP 接口用的，选错了前端会直接报 `USERKEY_PLAT_NOMATCH`。

创建完成后你会得到：

- **Key**：一串 ID，标识你的应用；
- **安全密钥（securityJsCode）**：2021 年 12 月后新申请的 Key 必须配套使用，否则报 `INVALID_USER_SCODE`。

一句话理解两者关系：**Key 相当于账号，安全密钥相当于密码**，缺一个都登不上。

## 封装 loadAMap 模块

安装 Loader：

```bash
pnpm add @amap/amap-jsapi-loader
```

类型声明用本系列配套的 [amap-jsapi.d.ts](/types/amap-jsapi.d.ts)（核心类 + 本系列用到的全部插件，覆盖比第三方类型包更全），放到项目 `src/types/` 下即可，`tsconfig` 无需任何配置。第三方类型包（`@amap/amap-jsapi-types`、`@vuemap/amap-jsapi-types`）覆盖不全且维护滞后，**不要再装**，否则两份声明合并会产生命名空间重复冲突。

Key 与安全密钥通过环境变量注入，项目根目录建 `.env.local`（已被 git 忽略，不进代码库）：

```bash
VITE_AMAP_KEY=你申请的 Key
VITE_AMAP_SECRET_KEY=你的安全密钥 securityJsCode
```

```typescript
// src/utils/amap.ts —— 高德地图加载统一入口
import AMapLoader from '@amap/amap-jsapi-loader'

// 安全密钥必须挂在 window 上，且要在 Loader 执行之前设置！
window._AMapSecurityConfig = {
  securityJsCode: import.meta.env.VITE_AMAP_SECRET_KEY,
}

const loadedPlugins = new Set<string>()

/** 加载高德地图与插件（Loader 自身会缓存核心包，可重复调用，增量加载新插件） */
export function loadAMap(plugins: string[] = []): Promise<typeof AMap> {
  const unloaded = plugins.filter((plugin) => !loadedPlugins.has(plugin))
  unloaded.forEach((plugin) => loadedPlugins.add(plugin))
  return AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY, // 申请好的 Web端(JS API) Key
    version: '2.0',                     // 目前主流 2.0
    plugins: unloaded,                  // 只传还没加载过的插件
  })
}
```

> **注意**：不要把整个 `AMapLoader.load` 的 Promise 缓存成单例——那样后续调用传入的新插件会被忽略，运行时直接报 `AMap.PlaceSearch is not a constructor`。核心包的缓存 Loader 自己会做，这里只需记录已加载的插件做增量加载。

需要类型提示时，在 `env.d.ts` 里补充声明：

```typescript
interface ImportMetaEnv {
  readonly VITE_AMAP_KEY: string
  readonly VITE_AMAP_SECRET_KEY: string
}
```

> **注意**：`window._AMapSecurityConfig` 的执行时机必须早于地图加载，放在模块顶层最稳妥。插件采用按需加载机制，用到什么就在 `plugins` 数组里加什么。

## Vue 3 的两个坑

1. **地图实例必须用 `shallowRef`（或 `markRaw`）保存**
   Vue 3 的 `ref` 会对对象做深度响应式代理，地图实例被 Proxy 代理后内部状态异常，轻则性能暴跌，重则拖动报错。
2. **地图容器必须有高度**
   `<div>` 没设 `height` 时高度为 0，地图「加载成功却看不见」。
