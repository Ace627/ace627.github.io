# Vue 工程化

> 前置：请先读首篇《高德地图 JS API 教程》。本篇把前几篇的零散逻辑沉淀成**可复用的工程代码**，是整个系列的灵魂。

## 为什么要封装 useAMap？

前面各篇的代码都是「组件里直接写」，问题很明显：每个用到地图的组件都要重复 `shallowRef`、`onMounted` 加载、`onBeforeUnmount` 销毁。抽成组合式函数，一处维护处处使用——组件只管传一个容器 ref 和初始化配置，剩下的它全包：

```typescript
// src/composables/useAMap.ts
import { ref, shallowRef, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { loadAMap } from '@/utils/amap'

/** 地图生命周期管理：创建、销毁、就绪状态，全在这一个函数里 */
export function useAMap(
  el: Ref<HTMLElement | null>,   // 容器 ref（useTemplateRef 得到的那个，别在 composable 里写死 ref 名）
  options: AMap.MapOptions = {}, // new AMap.Map 的初始化配置
  plugins: string[] = [],        // 需要的插件
) {
  const AMap = shallowRef<typeof AMap | null>(null) // AMap 命名空间
  const map = shallowRef<AMap.Map | null>(null)     // 地图实例
  const ready = ref(false)                          // 地图是否就绪

  onMounted(async () => {
    AMap.value = await loadAMap(plugins)
    if (!el.value) return // 容器不存在时跳过
    map.value = new AMap.value.Map(el.value, options)
    ready.value = true
  })

  onBeforeUnmount(() => {
    map.value?.destroy()
    map.value = null
    ready.value = false
  })

  return { AMap, map, ready }
}
```

组件里的用法变得极简：

```vue
<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useAMap } from '@/composables/useAMap'

const mapRef = useTemplateRef('mapRef')
const { map, ready } = useAMap(mapRef, {
  zoom: 12,
  center: [116.397428, 39.90923],
})
</script>
```

## 业务型组合式函数

以「给一组数据打点」为例，业务组件不再关心 Marker 细节。有个细节要防：**数据和地图谁先到不确定**——接口可能比地图慢，组件也可能被 HMR 重载。所以内部用联合 watch，任何一边变化就重画，不依赖调用时机：

```typescript
// src/composables/useMarkers.ts
import { watch, onBeforeUnmount, type Ref } from 'vue'

interface Point {
  lng: number
  lat: number
  name: string
}

export function useMarkers(
  map: Ref<AMap.Map | null>,
  AMap: Ref<typeof AMap | null>,
  dataRef: Ref<Point[]>,
) {
  let markers: AMap.Marker[] = []

  function render() {
    if (!AMap.value || !map.value) return
    map.value.remove(markers) // 先清旧点
    markers = []
    for (const p of dataRef.value) {
      markers.push(new AMap.value.Marker({
        position: [p.lng, p.lat],
        title: p.name,
      }))
    }
    map.value.add(markers)
  }

  // 数据和地图谁后到都不怕：任何一边变化就重画
  watch([dataRef, map, AMap], render)

  onBeforeUnmount(() => map.value?.remove(markers))
}
```

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAMap } from '@/composables/useAMap'
import { useMarkers } from '@/composables/useMarkers'

const { AMap, map } = useAMap(mapRef, { zoom: 12, center: [116.397428, 39.90923] })
const points = ref<Point[]>([])

useMarkers(map, AMap, points) // 提前挂上也没问题，数据到了自动画

onMounted(async () => {
  points.value = await fetchPoints() // 假设的取数接口
})
</script>
```

## 地图相关的状态放哪？

经验法则：

- **地图实例本身**：永远留在组件/组合式函数里（`shallowRef`），**绝不进 Pinia**——响应式容器管理全局状态会把地图实例代理出问题；
- **业务数据（点位列表、选中项）**：放 Pinia 或组件 props，地图只是数据的「一种视图」；
- **多个组件共享同一张地图**：用「提供者组件 + 插槽/子组件」模式，父组件 `useAMap` 后通过 `provide` 下发 `map` 和 `AMap`。

## 其他工程化要点

1. **按需加载**：插件只在用到的页面 `loadAMap(['AMap.PlaceSearch'])`，别一上来全量加载。
2. **SSR（Nuxt）**：`window._AMapSecurityConfig` 和地图初始化都会碰 `window`，必须放在 `<ClientOnly>` 包裹的组件内或 `onMounted` 里，否则服务端渲染直接报 `window is not defined`。
3. **Key 不进代码库**：Key/securityJsCode 通过 `.env.local` + `import.meta.env` 注入（配置见首篇），确认 `.env.local` 没有被提交进仓库。

## 常见坑

| 坑 | 解法 |
|---|---|
| 地图实例放进 Pinia 全局 store | 永远不要，放组件内 shallowRef |
| Nuxt SSR 报 window is not defined | `<ClientOnly>` 或 onMounted 内初始化 |
| 多个组件各自 new 地图，白屏/重叠 | provide/inject 共享同一实例 |
| TS 报 AMap 类型不存在 | 把首篇的 amap-jsapi.d.ts 放进项目 src/types/，不要装第三方类型包 |

## 相关阅读

- 上一篇：《定位与轨迹》
- 下一篇：《性能与进阶》—— 点聚合、图层与实时数据
