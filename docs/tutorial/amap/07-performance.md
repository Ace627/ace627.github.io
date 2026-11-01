# 性能与进阶

> 前置：请先读首篇《高德地图 JS API 教程》和《Vue 工程化》。本篇是系列收官，覆盖大数据量、图层叠加和实时刷新。

## 点聚合 MarkerCluster

点聚合把密集的点缩成一个带数字的圆圈，放大后自动展开：

```typescript
const AMap = await loadAMap(['AMap.MarkerCluster'])
if (!map.value) return

const cluster = new AMap.MarkerCluster(map.value, points, {
  gridSize: 60,          // 聚合计算网格大小
  renderMarker: (ctx) => { /* 自定义单个点的样式 */ },
  renderClusterMarker: (ctx) => { /* 自定义聚合圆圈样式 */ },
})

// cluster.setData(newPoints) // 数据更新
```

适用场景：门店分布、设备点位等「总量大但允许聚合展示」的数据。

## 海量点 MassMarks

不允许聚合（每个点都要显示）时用 MassMarks，它走 Canvas 批量渲染：

```typescript
const AMap = await loadAMap(['AMap.MassMarks'])
if (!map.value) return

const mass = new AMap.MassMarks(data, {
  style: [
    { url: 'a.png', size: new AMap.Size(20, 30), anchor: [10, 30] },
    { url: 'b.png', size: new AMap.Size(20, 30), anchor: [10, 30] },
  ],
})
mass.setMap(map.value)
```

经验阈值：几百点 → 普通 Marker；几千点 → MarkerCluster 或 MassMarks；几万+ → MassMarks + 数据抽稀（抽稀就是点太密时隔几个取一个，肉眼看不出差别，渲染压力小一大截）。

## 图层叠加

```typescript
// 卫星图层/路网图层
const satellite = new AMap.TileLayer.Satellite()
const roadNet = new AMap.TileLayer.RoadNet()
if (!map.value) return
map.value.add([satellite, roadNet])

// 实时交通路况（红绿路线）：2.0 里是核心自带的 TileLayer.Traffic，不是插件，不用 loadAMap 加载
const traffic = new AMap.TileLayer.Traffic({ autoRefresh: true, interval: 180 })
map.value.add(traffic)

// 切换显隐
traffic.show() // 显示
traffic.hide() // 隐藏
```

WebSocket + 地图实时刷新（如设备告警点）的要点：

```typescript
ws.onmessage = (event: MessageEvent) => {
  const { lng, lat, level } = JSON.parse(event.data) as { lng: number; lat: number; level: number }
  marker.setPosition([lng, lat])
  marker.setIcon(iconByLevel(level)) // 按告警级别换图标
}
```

注意高频消息做**节流**（如 500ms 合并一次），否则地图渲染跟不上。

## 常见坑合集（全系列汇总）

| 报错/现象 | 原因 | 解法 |
|---|---|---|
| `INVALID_USER_SCODE` | 安全密钥没配或配晚了 | `window._AMapSecurityConfig` 在 load 之前执行 |
| `USERKEY_PLAT_NOMATCH` | Key 服务平台选错 | 重新申请「Web端(JS API)」类型 Key |
| `AMap is not defined` | 在 Loader 完成前使用了 AMap | 所有地图逻辑放在 `await loadAMap()` 之后 |
| 地图不显示 | 容器高度为 0 | 显式设置宽高 |
| 拖动报 Proxy 错误 | 实例被 Vue 3 深度代理 | `shallowRef` / `markRaw` |
| 路由切换内存上涨 | 没销毁地图 | `onBeforeUnmount` 里 `map.destroy()` |
| 插件功能无效 | 插件未加载 | 加入 `loadAMap` 的 `plugins` 数组 |
| 后补的插件不生效 | 手写单例只在首次 `load` 传 `plugins`，后续调用的新插件被忽略 | 用首篇的增量版 `loadAMap`（内部记录已加载插件、只 `load` 增量） |
| 大量点卡死 | 普通 Marker 渲染上限 | MarkerCluster / MassMarks |
| 定位无效 | 非 HTTPS 环境 | 上 HTTPS，或降级 IP 定位 |
| 报 `AMap.Traffic is not a constructor` | `AMap.Traffic` 是 1.4 的旧插件名，2.0 Loader 对未知插件名静默跳过，到 `new` 时才炸 | 2.0 用核心类 `AMap.TileLayer.Traffic`，不需要加载插件 |

## 系列完结

至此整个系列完结。回顾路径：**入门 → 基础 → 标记 → 搜索 → 定位 → 工程化 → 性能**。实际项目中，建议把工程化篇的 `useAMap` 模式作为团队标准写法统一沉淀。

- 官方示例中心：https://lbs.amap.com/demo/javascript-api/example/launcher
- JS API 2.0 参考手册：https://lbs.amap.com/api/javascript-api-v2/documentation
