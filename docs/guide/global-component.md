# 全局组件

项目通用组件统一放在 `apps/admin/src/components/`（大驼峰命名，入口文件固定为 `index.vue`），并在 `src/plugins/modules/global-component.ts` 中集中注册，任意页面模板可直接使用，无需手动 `import`。现有组件的清单与详细用法见 [组件文档](./components)。

## 使用方法

### 模板直接使用

全局组件无需引入，写标签即用：

```vue
<template>
  <!-- 内容超过 10 字自动省略并启用提示 -->
  <ProTooltip :content="row.remark" :length="10" />
</template>
```

### 获取组件实例

需要调用组件方法（如 `CrontabDialog` 的 `open()`）时，用 `useTemplateRef` 取实例；类型可直接引用 `GlobalComponents` 中声明的组件类型，无需手写：

```vue
<template>
  <CrontabDialog ref="crontabRef" @confirm="handleConfirm" />
</template>

<script setup lang="ts">
import type { GlobalComponents } from 'vue'

const crontabRef = ref<InstanceType<GlobalComponents['CrontabDialog']>>()

crontabRef.value?.open('0 0 2 * * ?')
</script>
```

::::: tip
模板中的标签提示、Props 类型检查、`InstanceType<GlobalComponents['Xxx']>` 实例类型，全部依赖 `src/types/global/global-component.d.ts` 的类型声明文件，注册新组件时记得同步声明（见下文第三步）。
:::::

## 新增全局组件

以新增一个 `MyButton` 组件为例，共三步：

### 1. 创建组件目录

在 `src/components/` 下新建大驼峰目录，入口文件固定为 `index.vue`：

```vue
<!-- src/components/MyButton/index.vue -->
<template>
  <el-button type="primary">{{ text }}</el-button>
</template>

<script setup lang="ts">
defineOptions({ name: 'MyButton' })

withDefaults(defineProps<{ text?: string }>(), { text: '确定' })
</script>
```

### 2. 注册组件

在 `src/plugins/modules/global-component.ts` 中导入并注册，注册名即模板中使用的标签名：

```ts
import MyButton from '@/components/MyButton/index.vue'

export function registerGlobalComponent(app: App<any>) {
  // ...已有注册
  app.component('MyButton', MyButton)
}
```

### 3. 声明模板类型

在 `src/types/global/global-component.d.ts` 的 `GlobalComponents` 接口中补充声明：

```ts
declare module 'vue' {
  export interface GlobalComponents {
    // ...已有声明
    MyButton: (typeof import('../components/MyButton/index.vue'))['default']
  }
}
```

完成。刷新后任意页面即可直接使用 `<MyButton text="保存" />`，并享受完整的类型提示。

::::: warning
跳过第三步组件也能正常运行，但模板中没有 Props 类型检查，`ref` 取实例时也无法获得类型推导，请务必三步都做。
:::::

## 是否需要全局注册

全局注册会让组件进入主包并常驻可用，不要滥用：

- **跨页面复用的通用组件**（表格、分页、字典回显等）→ 放 `src/components/` 全局注册
- **仅单个页面使用的业务组件**（如用户编辑弹窗）→ 放页面同级 `components/` 目录，局部 `import` 引入即可

::::: tip
`Pro` 前缀是对原生组件做增强封装的系列约定（`ProTable` / `ProSearch` / `ProPagination` 等），新组件可按语义自行命名，非强制。
:::::
