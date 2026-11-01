# 定位与轨迹

> 前置：请先读首篇《高德地图 JS API 教程》，本篇默认已有 `map` 实例。

## 怎么获取用户当前位置？

```typescript
const AMap = await loadAMap(['AMap.Geolocation'])

const geolocation = new AMap.Geolocation({
  enableHighAccuracy: true, // 高精度（优先浏览器定位）
  timeout: 10000,           // 10 秒超时
  maximumAge: 0,            // 不用缓存结果
})

geolocation.getCurrentPosition((status, result) => {
  if (status === 'complete' && map.value) {
    const { lng, lat } = result.position
    console.log('当前位置：', lng, lat, result.accuracy) // accuracy 为精度(米)
    map.value.setCenter([lng, lat])
  } else {
    console.warn('定位失败：', result)
  }
})
```

定位是「尽力而为」的能力，插件内部会自动降级：

1. **先试浏览器定位**：精度最好（几十米内），但要 HTTPS；
2. **不行就用 IP 定位**：只能定位到城市级，聊胜于无；
3. **再不行就别硬撑**：让用户在地图上手动选个点，这招永远管用。

> **注意**：浏览器定位**必须在安全上下文**下才可用：线上要 HTTPS，本地要用 `localhost` / `127.0.0.1`——用局域网 IP（如 `http://192.168.x.x`）访问同样视为非安全上下文，会直接失败。这是最常见的「定位不生效」原因，报错特征是 `Get geolocation timeout` + `Get ipLocation failed`。

## 轨迹回放（moveAlong）

车辆/骑手的历史轨迹回放是高频需求，核心 API 是 `Marker.moveAlong`：

```typescript
const AMap = await loadAMap()
if (!map.value) return
const path: [number, number][] = [
  [116.39, 39.90], [116.40, 39.91], [116.41, 39.92],
  [116.42, 39.91], [116.43, 39.90],
]

// 先画出完整轨迹线
const polyline = new AMap.Polyline({ path, strokeColor: '#1890ff', strokeWeight: 4, showDir: true })
map.value.add(polyline)

// 让小车沿轨迹移动
const carMarker = new AMap.Marker({
  position: path[0],
  icon: 'car.png',
  offset: new AMap.Pixel(-13, -13),
  autoRotation: true, // 车头自动转向
})
map.value.add(carMarker)

carMarker.moveAlong(path, {
  duration: 200,    // 每段耗时(毫秒)
  autoRotation: true,
})
// carMarker.pauseMove() / resumeMove() / stopMove()
```

## 实时位置上报与地图跟随

车辆实时位置通常由 WebSocket 推送，前端收到新坐标后更新 Marker 并跟随：

```typescript
function updateCarPosition(marker: AMap.Marker, lng: number, lat: number, follow = true) {
  marker.setPosition([lng, lat])
  if (follow) {
    map.value?.setCenter([lng, lat]) // 简单跟随；更平滑可用 map.panTo
  }
}
```

要点：

- Marker 频繁 `setPosition` 没有性能问题，别销毁重建；
- 如果用户手动拖动了地图，可以暂停跟随（`follow = false`），并提供「回到车辆」按钮；
- 两个坐标点之间做插值动画会更平滑（进阶可用 `moveAlong` 传两个点实现匀速移动）。

## 常见坑

| 坑 | 解法 |
|---|---|
| 线上定位失败 | 确认 HTTPS；失败时降级 IP 定位或手动选点 |
| localhost 且权限已允许，仍报 `Timeout expired` | Chrome 的浏览器定位依赖它自家的定位服务，国内网络环境经常整体超时：换 Edge/Firefox 对照验证，业务上做「手动选点」兜底 |
| 用原生 `navigator.geolocation` 测试也超时 | 浏览器/系统环境根本拿不到定位（Windows 定位服务被关、VPN 干扰、台式机没 WiFi）：系统设置里开定位服务；接受失败做降级，定位天生是「尽力而为」的能力 |
| 轨迹点太多卡顿 | 轨迹线用抽稀后的点集， Marker 只放当前车 |
| moveAlong 车头方向不对 | 加 `autoRotation: true`，且图标默认朝向要是「右」 |
| 跟随时地图跳动 | 用 `panTo` 平滑移动，且用户交互后暂停跟随 |

## 相关阅读

- 上一篇：《搜索与地理编码》
- 下一篇：《Vue 工程化》—— 把这些逻辑封装成可复用的组合式函数
