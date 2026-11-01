# 字典使用

字典用于维护业务中的枚举数据（如用户状态、用户性别）。在「字典管理」页面配置后，前端通过 `useDict` Hook 加载选项、`DictTag` 组件回显标签，两端均已内置缓存，开箱即用。

## 配置字典

系统管理 → 字典管理：

1. 新建**字典类型**（如 `sys_normal_disable`，即 `dictType` 编码，前端加载时使用）
2. 维护**字典数据**，每条包含：

| 字段        | 说明                                             |
| ----------- | ------------------------------------------------ |
| `dictLabel` | 显示文本（如「正常」）                           |
| `dictValue` | 提交值（如 `0`）                                 |
| `listClass` | 回显样式（对应 `el-tag` 类型，可不配置渲染纯文本） |

## 加载字典数据

`useDict` 已自动导入，传入字典类型编码即可，支持一次加载多个类型，键名强类型推导：

```vue
<script setup lang="ts">
const { sys_normal_disable, sys_user_sex } = useDict('sys_normal_disable', 'sys_user_sex')
</script>
```

返回的选项数组在字典原始数据基础上扩展了通用 `label` / `value` 字段，可直接喂给 `el-select`、`el-radio-group` 等组件或 `ProSearch` 的 `options`，无需二次转换。

## 表单下拉选择

```vue
<template>
  <el-select v-model="form.status" placeholder="请选择状态">
    <el-option
      v-for="item in sys_normal_disable"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    />
  </el-select>
</template>
```

配置化搜索表单中作为下拉搜索项使用：

```ts
const searchItems: ProSearchItem[] = [
  { label: '状态', prop: 'status', type: 'select', options: sys_normal_disable },
]
```

## 表格列回显

`ProTable` 自定义渲染列中用 `DictTag` 回显：

```vue
<template>
  <ProTable ref="tableRef" :loading :data="list" :columns>
    <template #status="{ row }">
      <DictTag :options="sys_normal_disable" :value="row.status" />
    </template>
  </ProTable>
</template>
```

```ts
const columns: ProTableColumn<UserEntity>[] = [
  { align: 'center', prop: 'status', label: '状态', slot: 'status', width: 80 },
]
```

## 回显规则

`DictTag` 的渲染逻辑：

- 字典项配置了 `listClass` → 渲染带色的 `el-tag`（如 `success` / `danger`）
- 未配置 `listClass` → 渲染纯文本
- 值无匹配或字典未加载 → 兜底显示原始值，空值显示 `-`

## 缓存与刷新

- **前端**：`useDict` 使用模块级缓存，同一字典类型仅首次实际请求，跨组件共享；同类型的并发请求会复用同一个 `Promise`，不会重复打接口
- **后端**：字典数据同样有服务端缓存，编辑字典类型时会在事务内级联同步缓存

注意：字典数据变更**不会自动同步**到已加载过的页面（前端模块级缓存仍持有旧数据）。字典管理页提供「刷新缓存」按钮，一键清理服务端缓存并调用 `resetDictCache()` 重置前端缓存；自行开发时也可手动触发：

```ts
import { resetDictCache } from '@/hooks/useDict'

resetDictCache()
```
