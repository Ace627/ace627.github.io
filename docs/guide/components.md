# 组件文档

以下组件位于 `admin/src/components/`，已在 `src/plugins/modules/global-component.ts` 中全局注册，任意页面可直接使用，无需手动引入。如何新增一个全局组件，见 [全局组件](./global-component)。

| 组件           | 说明                                     |
| -------------- | ---------------------------------------- |
| `ProTable`     | 基于封装的增强表格，配置化渲染列         |
| `ProSearch`    | 配置化搜索表单，快速实现列表搜索         |
| `ProPagination`| 分页组件，兼容 el-pagination 全部属性    |
| `ProTooltip`   | 增强提示组件，文字超长自动省略           |
| `ProChart`     | ECharts 图表封装，自适应容器尺寸         |
| `RightToolbar` | 列表页右侧工具栏：搜索显隐、刷新、列显隐 |
| `DictTag`      | 字典标签回显                             |
| `SvgIcon`      | SVG 图标组件                             |
| `IconSelect`   | 图标选择器                               |
| `Crontab`      | Cron 表达式生成器弹窗                    |

## ProTable

在完整保留 `el-table` 全部原生 API 与特性的基础上，克制地加入了 `columns` 配置化渲染和 `loading` 加载态这两项最常用的增强，其余用法与原生完全一致，零学习成本。

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

| 属性     | 类型               | 说明                                   |
| -------- | ------------------ | -------------------------------------- |
| `columns`| `ProTableColumn[]` | 渲染列配置，兼容 el-table-column 全部属性 |
| `loading`| `boolean`          | 表格数据加载状态                       |
| `hiddenColumnKeys` | `string[]` | 隐藏列 key 数组，渲染前过滤，一般由 `RightToolbar` 的 v-model 接管 |

- `ProTableColumn` 的 `prop` 有泛型约束，严格对应行数据属性名，杜绝手写错误
- `slot` 指定自定义渲染列的插槽名

## ProSearch

配置化渲染搜索框，配合 `el-row` / `el-col` 的 24 格布局，快速实现列表页搜索区。

```vue
<template>
  <ProSearch :items="searchItems" v-model="queryParams" @search="handleQuery" @reset="handleQuery" />
</template>

<script setup lang="ts">
import type { ProSearchItem } from '@/components/ProSearch/types'

const queryParams = ref({ username: '', status: undefined })

const searchItems: ProSearchItem[] = [
  { label: '用户账号', prop: 'username', type: 'input' },
  { label: '状态', prop: 'status', type: 'select', options: sys_normal_disable },
]
</script>
```

| 属性               | 类型                        | 默认值  | 说明                             |
| ------------------ | --------------------------- | ------- | -------------------------------- |
| `items`            | `ProSearchItem[]`           | —       | 搜索项配置（必传）               |
| `span`             | `number`                    | —       | 每列宽度（基于 24 格布局）       |
| `gutter`           | `number`                    | —       | 表单控件间隙                     |
| `defaultExpanded`  | `boolean`                   | `false` | 默认是否展开                     |
| `labelPosition`    | `'left' \| 'right' \| 'top'`| —       | 表单域标签位置                   |
| `searchButtonText` | `string`                    | —       | 搜索按钮文本                     |
| `resetButtonText`  | `string`                    | —       | 重置按钮文本                     |

`ProSearchItem` 配置项：

| 属性          | 说明                                                        |
| ------------- | ----------------------------------------------------------- |
| `label`       | 表单项的标签文本                                            |
| `prop`        | 传递给表单项组件的属性（对应 query 字段名）                 |
| `type`        | 表单项类型：`input` / `select` / `date`                     |
| `placeholder` | 占位符文本                                                  |
| `options`     | 选项数据，用于 `select` 等，支持 `Ref` 响应式数组           |
| `hidden`      | 是否隐藏该表单项                                            |

## ProPagination

分页组件，兼容 `el-pagination` 全部属性，并内置移动端适配（小屏自动精简 layout 与页码数量）。

```vue
<ProPagination
  v-model:current-page="queryParams.pageNum"
  v-model:page-size="queryParams.pageSize"
  :total="total"
  @pagination="getList"
/>
```

| 属性            | 类型       | 默认值                          | 说明                     |
| --------------- | ---------- | ------------------------------- | ------------------------ |
| `total`         | `number`   | —                               | 总条目数（必传）         |
| `pageSizeList`  | `number[]` | `[10, 20, 30, 40, 50]`          | 每页条数选项             |
| `layout`        | `string`   | `total, sizes, prev, pager, next, jumper` | 组件布局        |
| `background`    | `boolean`  | `true`                          | 页码按钮添加背景色       |
| `pagerCount`    | `number`   | `7`                             | 移动端页码按钮数量       |
| `align`         | `string`   | `right`                         | 对齐方式：`left` / `center` / `right` |

事件：`@pagination` —— 页码或每页条数变化时触发，一般在此重新拉取列表。

## ProTooltip

增强提示组件，透传 `el-tooltip` 全部属性。内容超过 `length` 字数自动省略并启用提示，未超出则不弹提示。

```vue
<ProTooltip :content="row.remark" :length="10" :width="320" />
```

| 属性       | 类型               | 默认值  | 说明                                   |
| ---------- | ------------------ | ------- | -------------------------------------- |
| `content`  | `string`           | `''`    | 提示内容，兼容原生用法                 |
| `length`   | `number`           | `8`     | 显示最大字数，超出自动省略             |
| `width`    | `string \| number` | `320`   | 提示框最大宽度                         |
| `ellipsis` | `string`           | `...`   | 省略符号                               |

## ProChart

ECharts 图表封装。基于 `ResizeObserver` 实现容器尺寸自适应，自动跟随明暗主题切换，组件卸载时自动销毁实例防止内存泄漏。

```vue
<template>
  <ProChart :options="chartOptions" custom-class="h-300px" />
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const chartOptions: EChartsOption = {
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [120, 200, 150] }],
}
</script>
```

| 属性          | 类型            | 说明                                       |
| ------------- | --------------- | ------------------------------------------ |
| `options`     | `EChartsOption` | ECharts 官方配置项，遵循官方规范           |
| `customClass` | `string`        | 自定义类名，可通过 `h-300px` 等控制宽高    |

## RightToolbar

列表页右侧工具栏，与 `ProTable` / `ProSearch` 配套使用，提供三项能力：显隐搜索区域、刷新列表、配置列显隐（下拉勾选）。列显隐状态可通过 `storageKey` 持久化到 localStorage，下次进入页面自动恢复。

```vue
<template>
  <div class="mb-16px flex items-center justify-between">
    <div>
      <!-- 左侧：操作按钮 -->
    </div>
    <RightToolbar
      v-model:show-search="showSearch"
      v-model:hidden-column-keys="hiddenColumnKeys"
      :columns="columns"
      storage-key="system:user"
      @refresh="getList"
    />
  </div>

  <ProTable :data="list" :columns :hidden-column-keys="hiddenColumnKeys" />
</template>

<script setup lang="ts">
/** 搜索区域显隐（RightToolbar v-model 控制），经 ProSearch 的 v-show 使用 */
const showSearch = ref(true)
/** 隐藏列 key 数组（RightToolbar v-model 控制），转传给 ProTable 过滤渲染列 */
const hiddenColumnKeys = ref<string[]>([])
</script>
```

| 属性               | 类型               | 默认值 | 说明                                                       |
| ------------------ | ------------------ | ------ | ---------------------------------------------------------- |
| `search`           | `boolean`          | `true` | 是否显示「隐藏/显示搜索」按钮                              |
| `showSearch`       | `boolean`          | `true` | 搜索区域显隐状态（`v-model:showSearch`）                   |
| `columns`          | `ProTableColumn[]` | `[]`   | 列配置（只读，用于渲染勾选列表）；为空则不显示「列设置」按钮 |
| `hiddenColumnKeys` | `string[]`         | `[]`   | 隐藏列 key 数组（`v-model:hiddenColumnKeys`）              |
| `storageKey`       | `string`           | `''`   | 列显隐 localStorage 记忆 key；不传则不记忆                 |

事件：`@refresh` —— 点击刷新按钮后触发，一般在此重新拉取列表。

- 列 key 的生成规则与 `ProTable` 内部一致：`type` > `prop` > `slot` > `column-${index}`，直接把 `columns` 传进来即可，无需关心 key 细节
- `selection` / `index` 系统列与操作列（固定右侧的插槽列）会自动排除，不出现在勾选列表中

## DictTag

字典标签回显组件，根据字典选项与值渲染对应的 `el-tag`，已全局注册。

```vue
<!-- 表格回显：传入字典选项与当前行的值 -->
<DictTag :options="sys_normal_disable" :value="row.status" />
```

## SvgIcon

SVG 图标组件，基于 `vite-plugin-svg-icons` 雪碧图方案，已全局注册。

```vue
<!-- name：图标名称，对应 `@/assets/svg-icons` 目录下的文件名，必填 -->
<!-- color：图标颜色，可选，不传则继承父元素颜色 -->
<!-- size：图标大小，可选，默认 1em，支持 px / em / rem 等单位 -->
<SvgIcon name="Search" />
<SvgIcon name="Search" color="red" size="24px" />
```

## IconSelect

图标选择器，用于菜单管理等场景选择 SVG 图标。内置搜索框，支持按名称筛选。

```vue
<IconSelect :active-icon="form.icon" @selected="(name) => (form.icon = name)" />
```

| 属性         | 类型     | 说明                 |
| ------------ | -------- | -------------------- |
| `activeIcon` | `string` | 当前选中的图标名称   |

事件：`@selected` —— 选中图标后触发，参数为图标名称。

## Crontab

Cron 表达式生成器弹窗，用于定时任务管理。可视化选择秒 / 分 / 时 / 日 / 月 / 周 / 年七个维度，实时预览最近 5 次执行时间（`cron-parser`）与中文释义（`cronstrue`）。

```vue
<Crontab ref="crontabRef" @confirm="handleCronConfirm" />

<script setup lang="ts">
const crontabRef = useTemplateRef('crontabRef')

// 打开弹窗，可传入初始表达式
function open() {
  crontabRef.value?.open('0 0 2 * * ?')
}

function handleCronConfirm(cron: string) {
  form.value.cronExpression = cron
}
</script>
```

事件：`@confirm` —— 点击确定后触发，参数为生成的 Cron 表达式。
