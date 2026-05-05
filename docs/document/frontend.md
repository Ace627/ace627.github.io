# 前端手册

## 权限控制

```vue
<!-- 根据角色级进行控制 -->
<!-- 角色级适合粗粒度控制，例如某个操作区域只对管理员可见 -->
<el-link type="primary" v-permissions="['admin']">修改</el-link>

<!-- 根据按钮级进行控制 -->
<!-- 按钮级适合细粒度控制，能精确控制每个操作按钮的显隐，后端也需做对应鉴权 -->
<el-link type="primary" v-permissions="['system:role:update']">修改</el-link>
<el-link type="primary" v-permissions="['system:role:delete']">删除</el-link>
```

## 图标使用

```vue
<!-- name：图标名称，对应 `@/assets/icons` 目录下的文件名，必填 -->
<!-- color：图标颜色，可选，不传则继承父元素颜色 -->
<!-- size：图标大小，可选，默认 1em，支持 px / em / rem 等单位 -->
<!-- 该组件已全局注册，无需手动引入 -->
<SvgIcon name="Search" />
<SvgIcon name="Search" color="red" size="24px" />
```

## 提示弹窗

`TipModal` 基于 `ElMessage` 封装，提供消息提示、通知、确认、加载等功能

```vue
<script setup lang="ts">
import { TipModal } from '@/utils'

TipModal.msg('默认反馈')
TipModal.msgError('错误反馈')
TipModal.msgSuccess('成功反馈')
TipModal.msgWarning('警告反馈')

TipModal.notify('默认通知')
TipModal.notifyError('错误通知')
TipModal.notifySuccess('成功通知')
TipModal.notifyWarning('警告通知')

TipModal.showLoading('正在保存到本地，请稍候...')
TipModal.hideLoading()

async function confirm() {
  const { cancel } = await TipModal.confirm('确定要删除选中的数据吗？')
  if (cancel) return TipModal.msg('操作取消')
}

// 所有方法均支持传入 ElMessage 原有配置项
TipModal.msgSuccess('成功反馈', { duration: 2000 })
</script>
```

## 缓存使用

`CacheUtil` 基于 `localStorage` 实现，[**模拟 Redis 风格的键值存取**](https://mp.weixin.qq.com/s/miushZ-BDtrGo7_L4km8Hg)，方便前端开发者提前熟悉缓存操作模式，平滑向全栈过渡。

```typescript
// 1、定义缓存键名常量（统一管理，避免字面量散落）
// CACHE_PREFIX 为项目级前缀，保证同一域名下不同项目的缓存隔离
// apps\admin\src\common\constant\cache.constant.ts
export const CacheConstant = {
  /** 用户访问令牌的缓存键 */
  ACCESS_TOKEN: `${CACHE_PREFIX}:ACCESS:TOKEN`,
}

// 2、按模块封装缓存方法（推荐，与后端 Service 层风格类似）
// apps\admin\src\utils\cache\token.cache.ts
import { CacheConstant } from '@/common'
import { CacheUtil } from '../cache.util'

export function setAccessToken(accessToken: string): void {
  CacheUtil.set(CacheConstant.ACCESS_TOKEN, accessToken)
}
export function getAccessToken(): string | null {
  return CacheUtil.get(CacheConstant.ACCESS_TOKEN)
}
export function removeAccessToken(): void {
  CacheUtil.del(CacheConstant.ACCESS_TOKEN)
}

// 3、在 apps\admin\src\utils\index.ts 统一暴露
export * from './cache/token.cache'

// 也可以不封装模块直接使用 CacheUtil.set/get/del，
// 但务必在 cache.constant.ts 中统一定义缓存键名，方便管理。
// CacheUtil 支持字符串、数字、布尔、对象、数组等类型，并可设置过期时间（秒）。
```

## 字典使用

```vue
<template>
  <!-- 表格回显：DictTag 已全局注册，传入选项和值即可 -->
  <DictTag :options="sys_normal_disable" :value="row.status" />
  <!-- 下拉选择 -->
  <el-select :options="sys_normal_disable" />
  <!-- 单选组 -->
  <el-radio-group :options="sys_normal_disable" />
</template>

<script setup lang="ts">
// useDict 已支持自动引入，传入字典类型编码即可
const { sys_normal_disable, sys_user_gender } = useDict('sys_normal_disable', 'sys_user_gender')
</script>
```

## 表格使用

我们只是在完整保留 `el-table` 全部原生 API 与特性的基础上，克制地加入了 `columns` 配置化渲染和 `loading` 加载态这两项最常用的增强，其余用法与原生完全一致，零学习成本，即拿即用，用最小封装换取最高效率，坚决杜绝过度抽象。

```vue
<template>
  <ProTable ref="tableRef" :loading :data="list" :columns>
    <template #status="{ row }">
      <DictTag :options="sys_normal_disable" :value="row.status" />
    </template>
    <template #action="{ row }">
      <el-link type="primary">修改</el-link>
      <el-link type="primary">删除</el-link>
    </template>
  </ProTable>
</template>

<script setup lang="ts">
import type { ProTableColumn } from '@/types'

const tableRef = useTemplateRef('tableRef')
const loading = ref(false)
const list = ref<UserEntity[]>([])

// ProTableColumn 兼容 el-table-column 全部属性，prop 有泛型约束
const columns: ProTableColumn<UserEntity>[] = [
  { align: 'center', type: 'selection' },
  { align: 'center', type: 'index', label: '序号', width: 64 },
  { align: 'center', prop: 'username', label: '用户账号', showOverflowTooltip: true },
  { align: 'center', prop: 'status', label: '状态', slot: 'status', width: 80 },
  { align: 'center', prop: 'createTime', label: '创建时间', width: 160 },
  { align: 'center', slot: 'action', label: '操作', fixed: 'right', minWidth: 120 },
]
</script>
```
