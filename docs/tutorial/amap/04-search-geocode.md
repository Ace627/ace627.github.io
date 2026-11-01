# 搜索与地理编码

> 前置：请先读首篇《高德地图 JS API 教程》，本篇默认已有 `map` 实例。

## POI 搜索（PlaceSearch）

POI 就是地图里的一个地点——门店、公交站、收费站都算。POI 搜索就是拿关键词去找这些地点：

```typescript
const AMap = await loadAMap(['AMap.PlaceSearch'])
if (!map.value) return

const placeSearch = new AMap.PlaceSearch({
  city: '北京',          // 限定城市，提高准确性
  citylimit: true,       // 是否严格限城市
  pageSize: 10,          // 每页结果数
  pageIndex: 1,          // 页码
  panel: 'search-panel', // 结果列表容器 DOM 的 id（可选，自动生成可点击列表）
  map: map.value,        // 传入地图后，结果会自动标点
})

placeSearch.search('餐厅', (status, result) => {
  if (status === 'complete') {
    console.log('POI 列表：', result.poiList.pois)
  } else {
    console.warn('搜索失败：', result)
  }
})
```

上面配置跑起来的效果：搜索完成后地图上**自动出现一排按序号编号的结果点**（1 ~ `pageSize`，默认 10 个，所以你会看到 1~10 整整齐齐一排），点击序号点弹出该 POI 的信息窗体，`panel` 容器里同步生成可点击的结果列表。

- **点太多** → 调小 `pageSize`；想完全自己控制打点，就别传 `map`，在回调里拿 `result.poiList.pois` 自己 `new AMap.Marker` 逐个画；
- **弹窗内容空白** → 先排查是不是把别处自己 `new` 的 InfoWindow（如标记篇的示例）也绑到了这些序号点上，抢先打开了空窗体；
- **报 `Cannot set properties of null (setting 'innerHTML')`** → 传了 `panel` 但页面上没有对应 id 的元素，补一个 `<div id="search-panel"></div>` 或删掉 `panel` 配置。

其他常用方法：`searchInBound`（范围内搜索）、`searchNearBy`（周边搜索，如「某坐标 1km 内的便利店」）。

## 地理编码（地址↔经纬度）

地理编码说白了就是把「人看的地址」和「机器用的经纬度」互相翻译：地址 → 经纬度叫**正地理编码**，经纬度 → 地址叫**逆地理编码**：

```typescript
const AMap = await loadAMap(['AMap.Geocoder'])
const geocoder = new AMap.Geocoder({ city: '北京' }) // 可限城市提高准确率

// 地址 → 经纬度（正地理编码）
geocoder.getLocation('北京市朝阳区望京SOHO', (status, result) => {
  if (status === 'complete') {
    const { lng, lat } = result.geocodes[0].location
    console.log('经纬度：', lng, lat)
  }
})

// 经纬度 → 地址（逆地理编码）
geocoder.getAddress([116.397428, 39.90923], (status, result) => {
  if (status === 'complete') {
    console.log('地址：', result.regeocode.formattedAddress)
  }
})
```

典型用途：后台存的业务数据只有地址字符串，前端入库前先转成经纬度存起来；或点击地图取坐标后反查地址（配合 `map.on('click', e => e.lnglat)`）。

## 地理编码的兜底与回退

**Geocoder 对「下洼收费站」这类 POI 型关键词会静默挂起**：不回调、不发请求、也不报错。如果你搜「北京西站」一切正常、搜某个收费站/小区/公司名却让按钮 loading 永久转圈，就是撞上了它——POI 名不是结构化地址，正地理编码不一定接得住。

解法分两层：把回调式服务包成 Promise 加超时兜底，超时或拿不到结果就回退 POI 搜索（PlaceSearch 对 POI 名是主场）：

```typescript
// 插件：loadAMap(['AMap.Geocoder', 'AMap.PlaceSearch'])

/** 把回调式服务包成 Promise；超时返回 null（SDK 对个别关键词既不回调也不报错，必须兜底） */
function toPromise<T>(fn: (cb: (status: string, result: any) => void) => void, timeoutMs = 5000) {
  return new Promise<T | null>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(null)
    }, timeoutMs)
    fn((status, result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(status === 'complete' ? result : null)
    })
  })
}

/** 地址 → 坐标：先正地理编码，拿不到结果（含超时）回退 POI 搜索 */
async function searchCoordinate(address: string) {
  if (!map.value) return null

  const geocoder = new AMap.Geocoder()
  const geoResult = await toPromise<any>((cb) => geocoder.getLocation(address, cb))
  if (geoResult?.geocodes?.length) {
    const { location, formattedAddress } = geoResult.geocodes[0]
    return { formattedAddress, location: { lng: location.lng, lat: location.lat } }
  }

  const placeSearch = new AMap.PlaceSearch({ citylimit: false, pageSize: 10 })
  const poiResult = await toPromise<any>((cb) => placeSearch.search(address, cb))
  const poi = poiResult?.poiList?.pois?.[0]
  if (poi?.location) {
    return { formattedAddress: poi.name, location: { lng: poi.location.lng, lat: poi.location.lat } }
  }
  return null
}
```

**比兜底更要紧的是别乱限城市**：`city: '北京'` + `citylimit: true` 会把真正的目标直接过滤掉。真实案例：搜「下洼收费站」，它在河南省社旗县（S81 商南高速），北京限定下 Geocoder 无结果、回退 POI 又错配成房山的「蒲洼收费站」——看起来像「坐标偏移得离谱」，其实是搜错了地方。收费站、高速这类跨省设施，保持全国范围搜索。

## 输入联想（AutoComplete）

```typescript
const AMap = await loadAMap(['AMap.AutoComplete'])

const auto = new AMap.AutoComplete({ input: 'search-input' }) // 绑定输入框 DOM id
// 注意：2.0 的类名是 AutoComplete（大写 C），1.4 旧名 Autocomplete 会被静默跳过
auto.on('select', (e) => {
  console.log('选中的 POI：', e.poi)
  // e.poi.location 就是经纬度，可直接 setCenter 过去
})
```

输入框输入时自动出现联想下拉。实践中常把 **AutoComplete + PlaceSearch 组合**：联想选中后拿 POI 坐标定位，或把关键词转给 PlaceSearch 出完整列表。

### 和 Element Plus 输入框组合

配 `el-autocomplete` 时不绑 `input` id（组件自己管理输入框），改调 `search` 方法挂到 `fetch-suggestions` 上：

```vue
<el-autocomplete
  v-model="keyword"
  value-key="name"
  :trigger-on-focus="false"
  :fetch-suggestions="querySuggestions"
  @select="handleSelect"
>
  <!-- 左侧名称、右侧灰色行政区，重名 POI（出入口/东西向）靠它区分 -->
  <template #default="{ item }">
    <div class="flex items-center justify-between gap-8px">
      <span>{{ item.name }}</span>
      <span class="text-12px color-#999">{{ item.district }}</span>
    </div>
  </template>
</el-autocomplete>
```

```typescript
const keyword = ref('')
const autoComplete = shallowRef<AMap.AutoComplete | null>(null)

const AMap = await loadAMap(['AMap.AutoComplete'])
autoComplete.value = new AMap.AutoComplete({ citylimit: false }) // 全国范围，理由见上文「别乱限城市」

async function querySuggestions(queryString: string, cb: (tips: any[]) => void) {
  if (!autoComplete.value || !queryString.trim()) {
    cb([])
    return
  }
  // 联想服务同样可能不回调，复用上文 toPromise 兜底
  const result = await toPromise<any>((cb2) => autoComplete.value?.search(queryString, cb2))
  // 行政区/道路类提示没有坐标，过滤掉避免选中后无法定位
  cb((result?.tips ?? []).filter((tip: any) => tip.location))
}

function handleSelect(tip: any) {
  if (!map.value || !tip?.location) return
  // 选中即定位：tip 自带坐标，所见即所得，不用再搜一遍（也就不会搜错）
  map.value.setZoomAndCenter(16, [tip.location.lng, tip.location.lat])
}
```

## 路线规划（驾车为例）

```typescript
const AMap = await loadAMap(['AMap.Driving'])
if (!map.value) return

const driving = new AMap.Driving({
  map: map.value,     // 传入地图后自动画路线
  hideMarkers: true,  // 页面已有自己的起终点标记时，别让插件再画一对默认起终点图标
  autoFitView: false, // 默认 true 会把视野自动缩放包住整条路线；不想让规划结果劫持初始视野就关掉
  showTraffic: false, // 路况颜色分层，仅想要纯色路线时关掉
})

driving.search(
  [116.379028, 39.865042], // 起点 [lng, lat]
  [116.427281, 39.903719], // 终点
  (status, result) => {
    if (status === 'complete') {
      // result.routes[0]：路线详情（距离、时间、步骤）
      console.log('距离(米)：', result.routes[0].distance)
    }
  }
)
```

同类插件：`AMap.Transfer`（公交）、`AMap.Walking`（步行）、`AMap.Riding`（骑行）。起终点也支持传关键字（内部会先做地理编码）。

**各插件的路线结果结构不一样，别混用**（JSAPI 2.0 实测）：

| 插件 | `result.routes[0]` 的字段 | 分段路径 |
|---|---|---|
| Driving | `steps` / `restriction` / `distance` / `time` / `policy` / `tolls` / `tolls_distance` | `route.steps[n].path` |
| Riding | `distance` / `time` / `rides`（**没有 `steps`**） | `route.rides[n].path` |

网上大量 1.x 时代的示例用 `route.steps` 取骑行路径，在 2.0 的 Riding 上会直接抛 `TypeError: Cannot read properties of undefined (reading 'reduce')`——而且异常发生在回调里，表面上只是「路线没画出来」，极难排查。拿不准就先 `console.log(Object.keys(result.routes[0]))` 实测一眼，别照抄旧示例。

### 自绘路线（自定义配色、多条并存）

不传 `map` 让插件自己画，改为在回调里拼出完整路径手动画 `Polyline`——颜色、粗细、方向箭头全由你控制，多条路线还能各配各的色（比如按起点配色）：

```typescript
const AMap = await loadAMap(['AMap.Riding'])
if (!map.value) return

new AMap.Riding().search([fromLng, fromLat], [toLng, toLat], (status, result) => {
  if (status !== 'complete' || !result.routes?.length) return
  const route = result.routes[0]
  // Riding 2.0：分段在 route.rides（Driving 才是 route.steps）
  const path = route.rides.reduce((all, ride) => all.concat(ride.path || []), [])
  map.value.add(new AMap.Polyline({
    path,
    strokeColor: '#1aad19', strokeWeight: 6, strokeOpacity: 0.9,
    lineJoin: 'round', lineCap: 'round',
    showDir: true, // 白色方向箭头
  }))
})
```

### 批量规划必须兜底

一屏同时规划多条路线（比如点位两两互通）时，高德出行接口会**偶发 `error`**（疑似 QPS 限流），实测 6 个并发请求稳定挂 1~2 个。两条纪律：

1. **失败延时 1 秒重试一次**，基本都能恢复，不必上复杂的退避；
2. **回调里一律 `try/finally` 计数**：单条处理抛异常（比如上面 `steps`/`rides` 字段取错）不能拦住计数器归零，否则其余路线全画完了，页面还永远停在「规划中…」。

```typescript
let pending = pairs.length

pairs.forEach(([i, j]) => planRoute(i, j, 0))

function planRoute(i: number, j: number, attempt: number) {
  const riding = new AMap.Riding()
  riding.search(POINTS[i], POINTS[j], (status, result) => {
    try {
      if (status === 'complete' && result.routes?.length) {
        drawRoute(i, j, result.routes[0])
      } else if (attempt === 0) {
        setTimeout(() => planRoute(i, j, 1), 1000) // 接口偶发失败，重试一次
        return
      } else {
        markFailed(i, j)
      }
    } finally {
      if (status !== 'complete' && attempt === 0) return // 重试中的不计入完成数
      if (--pending === 0) renderSummary()
    }
  })
}
```

## 常见坑

| 坑 | 解法 |
|---|---|
| 搜索无效果且无报错 | 插件没加进 `loadAMap` 的 `plugins` 数组 |
| 报 `Cannot set properties of null (innerHTML)` | `panel` 指定的容器元素不存在，补容器或删掉 `panel` |
| 搜出来结果不在目标城市 | 设置 `city` + `citylimit: true` |
| 回调里 `status !== 'complete'` | 打印 `result` 看 reason，常见是 Key 配额或参数问题 |
| 路线画出来了拿不到距离 | 结果在 `result.routes[0]`，别只盯着回调状态 |
| 骑行路线画不出来，回调报 `Cannot read properties of undefined (reading 'reduce')` | 2.0 的 Riding 结果没有 `steps`，分段在 `route.rides[n].path`（Driving 才是 `steps`），别照抄 1.x 示例 |
| 批量规划多条路线，页面永远停在「规划中…」 | 单条回调里抛异常把计数器拦死了：`try/finally` 保证计数必执行 |
| 并发规划时偶发一两条 `error` | 高德出行接口 QPS 限流：延时 1 秒重试一次基本都能过 |
| 某些关键词回调一直不来，loading 永久转圈 | Geocoder 对 POI 型关键词会静默挂起（不回调/不发请求/不报错）：包 Promise 加超时兜底，失败回退 PlaceSearch |
| 搜出来的地方和预期完全对不上 | `city`/`citylimit` 把真目标过滤掉了（「下洼收费站」在北京限定下错配「蒲洼收费站」），跨省设施别限城市 |
| 限城市能防错配吗 | 防不住相邻区县的重名 POI：联想下拉里带上 `district` 让用户自己选，选中即用 tip 坐标 |

## 相关阅读

- 上一篇：《标记与覆盖物》
- 下一篇：《定位与轨迹》
