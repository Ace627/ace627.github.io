# 标记与覆盖物

> 前置：请先读首篇《高德地图 JS API 教程》，本篇默认你已能画出一张基础地图（`map` 为 `shallowRef` 保存的实例）。

## 怎么放标记点（Marker）？

```typescript
const AMap = await loadAMap()
if (!map.value) return

const marker = new AMap.Marker({
  position: [116.397428, 39.90923], // [经度, 纬度]
  title: '天安门',                   // 鼠标悬浮提示
  // 自定义图标（可选，默认是红色水滴图钉）
  icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
  offset: new AMap.Pixel(-25, -70), // 图标锚点偏移：按图标尺寸算，水平 -width/2、垂直 -height，让尖端对准坐标点
})

map.value.add(marker)        // 添加到地图
// map.value.remove(marker)  // 移除（或 marker.setMap(null)，同样是从地图移除）
```

**锚点偏移是新手最迷惑的点**：`position` 指的是地理坐标点，图标默认以左上角对齐该点，所以常需要用 `offset` 把图标「拉正」，让尖角/中心对准坐标。

## 信息窗体（InfoWindow）

信息窗体就是点击标记后弹出的那个气泡卡片，里面可以放标题、地址，甚至按钮：

```typescript
const infoWindow = new AMap.InfoWindow({
  // InfoWindow 的 HTML 直接插进页面 DOM，会被宿主全局样式污染（文字变色/被重置），
  // 内容用自己的 div 包一层并写关键内联样式
  content: '<div style="color:#333;line-height:1.6"><h4 style="margin:0 0 4px">天安门</h4><p style="margin:0">北京市东城区长安街</p></div>',
  offset: new AMap.Pixel(0, -32),
})

marker.on('click', () => {
  const position = marker.getPosition()
  if (!map.value || !position) return
  infoWindow.open(map.value, position)
})
```

`content` 支持任意 HTML 字符串，所以可以放按钮、图片，甚至挂 Vue 的事件（用事件委托处理点击即可）。也可以直接复用同一个 InfoWindow 实例，切换 content 后再 open，避免反复创建。

## 定位到点位并居中

典型场景：页面上有一份点位列表，点某一条，地图飞到对应点、放大并居中。用 `setZoomAndCenter` 一步到位：

```typescript
if (!map.value) return

// 点击列表项时调用：一次动画完成「放大 + 平移」
map.value.setZoomAndCenter(16, [116.217439, 39.90661], false, 400)
//                          │   │                 │      └ 动画时长 ms
//                          │   │                 └ false = 带动画；true = 瞬移
//                          │   └ 目标中心 [经度, 纬度]
//                          └ 目标层级
```

页面初始想让视野刚好包住全部点位，配合 `setFitView`（自动算层级和中心）：

```typescript
map.value.setFitView(markers) // 地图自动缩放平移到恰好能看全这批点
```

点位散布很广时（比如北京几个点 + 河南两个收费站），`setFitView` 会缩到省级才能看全；此时「列表点击 → `setZoomAndCenter` 飞到 16 级」就是标准的「总览 + 定位」组合。

## 覆盖物全家桶

高德把所有「画在地图上的东西」统称**覆盖物**——标记点、圆、多边形、折线都是覆盖物。除了点，还能画各种形状：

```typescript
// 圆：画一个 500 米的圆
const circle = new AMap.Circle({
  center: [116.397428, 39.90923],
  radius: 500, // 米
  strokeColor: '#1890ff', strokeWeight: 2,
  fillColor: '#1890ff', fillOpacity: 0.15,
})

// 多边形（如电子围栏）
const polygon = new AMap.Polygon({
  path: [[116.39, 39.91], [116.40, 39.91], [116.40, 39.90], [116.39, 39.90]],
  strokeColor: '#fa541c', fillColor: '#fa541c', fillOpacity: 0.2,
})

// 折线（如路线）
const polyline = new AMap.Polyline({
  path: [[116.39, 39.90], [116.40, 39.91], [116.41, 39.92]],
  strokeColor: '#52c41a', strokeWeight: 4,
  showDir: true, // 白色方向箭头，画路线时很实用
})

if (!map.value) return

// 统一 add 到地图
map.value.add([circle, polygon, polyline])
```

所有覆盖物都支持 `.on('click', ...)` 事件，用法和 Marker 一致。

## 海量点 MassMarks

几百个 Marker 没问题，几万个就会卡。海量点场景用 `AMap.MassMarks`：

```typescript
const AMap = await loadAMap(['AMap.MassMarks'])
if (!map.value) return

interface MassPoint {
  lnglat: [number, number] // [经度, 纬度]
  name: string
  style: number // 样式索引，对应 style 数组下标
}

const data: MassPoint[] = [
  { lnglat: [116.39, 39.91], name: '门店 A', style: 0 },
]

const massMarks = new AMap.MassMarks(data, {
  style: [{ url: 'marker.png', size: new AMap.Size(20, 30) }],
})
massMarks.setMap(map.value)
```

几万个点也能流畅渲染。更进阶的点聚合（MarkerCluster）见《性能与进阶》。

## 常见坑

| 坑 | 解法 |
|---|---|
| 图标位置不对 | 用 `offset` 校准锚点：`(-图标宽/2, -图标高)` |
| InfoWindow 内容里的 Vue 事件不生效 | content 是原生 HTML，用事件委托绑定 |
| 添加几百个 Marker 页面卡顿 | 改用 MassMarks 或 MarkerCluster |
| 覆盖物添加失败且无报错 | 确认实例创建时没把 AMap 传错（必须用 Loader 返回的 AMap） |
| 报 `Invalid Object: Pixel(NaN, NaN)` | `position` 传了普通 `{ lng, lat }` 对象：改传 `[lng, lat]` 数组或 LngLat 实例 |
| `marker.remove()` 写了却没移除 | 它不是文档 API（类型包里也没有）：用 `map.remove(marker)` 或 `marker.setMap(null)` |
| 点击定位第一次飘到别处、点两次才对 | `setZoomAndCenter` 飞行动画途中 `infoWindow.open()`，默认 `autoMove: true` 会按中途视口误判「窗体不可见」强行 pan，把地图中心劫持走：InfoWindow 创建时加 `autoMove: false`（锚点由 setZoomAndCenter 定到中心，无需自动纠偏） |
| 报 `TypeError: Cannot read properties of null (reading 'type')` | `map.remove(null)` 会直接抛错（变量初始值是 `null` 时首次移除必踩）：移除前先 `if (marker)` 判空 |

## 相关阅读

- 上一篇：《地图基础》
- 下一篇：《搜索与地理编码》—— 让用户找到地方
- 点聚合与性能优化：《性能与进阶》
