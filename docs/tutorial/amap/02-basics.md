# 地图基础

> 前置：请先读首篇《高德地图 JS API 教程》完成 Key 申请，并备好共用的 `loadAMap` 模块。

## 地图的生命周期是什么样的？

地图的生命周期就三步：**创建 → 使用 → 销毁**。Vue 里对应的是 `onMounted` 里创建、`onBeforeUnmount` 里销毁。

```vue
<!-- src/components/BaseMap.vue -->
<template>
  <!-- 地图容器：必须显式指定宽高，否则地图不可见 -->
  <div ref="mapRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
import { loadAMap } from '@/utils/amap'

const mapRef = useTemplateRef('mapRef') // 类型自动推导为 Ref<HTMLDivElement | null>
const map = shallowRef<AMap.Map | null>(null) // 关键：shallowRef，别用 ref！

async function initMap() {
  // 容器不存在或已初始化时跳过，防 HMR/重复挂载时重复创建地图
  if (!mapRef.value || map.value) return
  const AMap = await loadAMap()
  map.value = new AMap.Map(mapRef.value, {
    viewMode: '3D',                 // 2D / 3D 视图
    zoom: 12,                       // 缩放级别：数字越大离地面越近（3 能看全省，20 能看清楼）
    center: [116.397428, 39.90923], // 初始中心点：天安门 [经度, 纬度]
  })
}

onMounted(() => {
  initMap()
})

// 组件卸载时必须销毁地图，否则内存泄漏！
onBeforeUnmount(() => {
  map.value?.destroy()
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
}
</style>
```

## 常用的视图控制怎么写？

```typescript
if (!map.value) return // 地图未初始化时直接返回

// 缩放
map.value.setZoom(14)  // 直接设置
map.value.zoomIn()     // 放大一级
map.value.zoomOut()    // 缩小一级

// 中心点（从北京跳到上海，效果直观）
map.value.setCenter([121.4737, 31.2304]) // 直接跳转
map.value.panTo([121.4737, 31.2304])     // 平滑平移动画

// 一步到位：同时设置缩放 + 中心
map.value.setZoomAndCenter(15, [121.4737, 31.2304])

// 自动调整视野，恰好包住全部覆盖物（常用于初始化后总览所有标记点）
map.value.setFitView()        // 不传参 = 包住地图上全部覆盖物
map.value.setFitView(markers) // 也可只包住指定的这批覆盖物

// 获取当前状态
const zoom = map.value.getZoom()
const center = map.value.getCenter()

// 限制地图可拖动的范围（常用于城市级应用）
map.value.setLimitBounds([115.9, 39.4, 116.9, 40.2]) // [西南角经, 西南角纬, 东北角经, 东北角纬]
map.value.clearLimitBounds()                         // 解除限制
```

## 怎么加地图控件？

控件分两步：**先作为插件加载，再用 `addControl` 挂到地图上**，两步缺一不可——只加载不挂载，地图上什么都不会出现；没加载就 `addControl`，控件内部资源缺失，轻则不渲染、重则报错。

接着上面 `BaseMap` 的 `initMap`，创建地图之后添加：

```typescript
// initMap 里，new AMap.Map 之后：
const AMap = await loadAMap(['AMap.ToolBar', 'AMap.Scale']) // 控件也是插件，要先加载
map.value.addControl(new AMap.ToolBar({ position: 'RB' }))  // 缩放工具条，右下角
map.value.addControl(new AMap.Scale({ position: 'LB' }))    // 比例尺，左下角
// 常用的还有：AMap.ControlBar（3D 罗盘）、AMap.MapType（图层切换）
```

> **注意**：JS API 2.0 的 ToolBar 就是一组小小的 `+/−` 缩放按钮，在地图右下角，不注意看容易以为没加上。

实际项目中建议把插件并进创建地图前的那次 `loadAMap` 调用，一次加载完：

```typescript
const AMap = await loadAMap(['AMap.ToolBar', 'AMap.Scale'])
map.value = new AMap.Map(mapRef.value, { /* ... */ })
map.value.addControl(new AMap.ToolBar({ position: 'RB' }))
```

`addControl` 不限于初始化时机，页面运行中任何时候都能调用；动态移除控件用 `map.value.removeControl(...)`。

## 怎么换地图样式？

```typescript
// 初始化时指定
new AMap.Map(el, { mapStyle: 'amap://styles/dark' })

// 官方预设样式：normal / dark / light / whitesmoke / fresh / grey / macaron / blue / darkblue / wine
// 运行时切换（比如跟随站点深色模式）
if (!map.value) return
map.value.setMapStyle('amap://styles/whitesmoke')
```

## 常见坑

| 坑 | 解法 |
|---|---|
| 用 `ref` 保存地图实例，拖动报错 | 换 `shallowRef` 或 `markRaw` |
| 地图看不见 | 容器加宽高 |
| 路由切换后地图残留 | `onBeforeUnmount` 里 `map.destroy()` |
| 控件添加无反应 | 控件也是插件，没进 `loadAMap` 的 `plugins` 数组 |
| 控件"没出现" | ToolBar 只是右下角一组小 `+/−` 按钮、Scale 是左下角比例尺条，先仔细看角落；确认 `addControl` 在地图创建之后调用 |

## 相关阅读

- 下一篇：《标记与覆盖物》—— 往地图上放内容
- 官方文档：https://lbs.amap.com/api/javascript-api-v2/documentation
