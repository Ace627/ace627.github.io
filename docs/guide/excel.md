# 导入导出

导入导出是模板内置的通用 Excel 能力，由 `apps/server/src/modules/common/excel` 下的 `ExcelModule` / `ExcelService` 提供，基于 `exceljs`，流式输出不落盘。字段配置通过 `@Excel` 装饰器声明在实体属性上，导出数据与导入模板共用同一份配置。参考实现：`modules/monitor/log` 下的登录日志与操作日志模块（导出），以及用户模块的完整导入链路（模板下载 + 导入解析，见下文「导入」）。

## @Excel 装饰器

在实体属性上标注 `@Excel`，未被标注的字段不会出现在 Excel 中：

```typescript
import { Excel } from '@/common/decorator/excel.decorator'

@Entity({ name: 'sys_oper_log' })
export class OperlogEntity {
  @Excel({ name: '模块标题' })
  @Column({ type: 'varchar', length: 50, comment: '模块标题', default: null })
  title: string

  // 字典字段：导出时 值 → 标签，导入时 标签 → 值
  @Excel({ name: '操作类型', dictType: 'sys_oper_type' })
  @Column({ name: 'business_type', type: 'char', comment: '操作类型', default: BusinessType.OTHER })
  businessType: BusinessType

  // 日期字段：导出按 dateFormat 格式化，导入逆解析回统一存储格式
  @Excel({ name: '请求时间', width: 25 })
  @Column({ type: 'varchar', length: 20, comment: '请求时间', name: 'oper_time' })
  operTime: string

  // 列宽自定义示例（未指定 type，导出导入均生效）
  @Excel({ name: '请求标识', width: 40 })
  @Column({ type: 'varchar', length: 64, comment: '请求唯一标识', default: null })
  requestId: string
}
```

装饰器参数一览：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | - | 必填，Excel 中的列名 |
| `order` | `number` | `1` | 列排序，值越小越靠前，未配置时按声明顺序排在同 `order` 组内 |
| `dictType` | `string` | - | 字典 type，如 `sys_oper_type`，导出与导入自动做字典双向转换 |
| `defaultValue` | `string` | - | 值为空时的兜底：导出时作为单元格显示值，导入时作为解析值 |
| `type` | `ExcelType` | `2` | `0` 仅导入、`1` 仅导出、`2` 导出导入均可 |
| `width` | `number` | `15` | 列宽 |
| `dateFormat` | `string` | - | dayjs 格式，如 `YYYY-MM-DD`，导出时格式化，导入时逆解析 |

字段类型由 `common/constant/excel.constant.ts` 中的 `ExcelType` 常量划分：`IMPORT = '0'`、`EXPORT = '1'`、`ALL = '2'`。导出只取 `EXPORT` + `ALL` 字段，导入模板与导入解析只取 `IMPORT` + `ALL` 字段，两者互不影响。

## 实现机制

了解 `ExcelService` 内部行为，有助于排查样式与数据问题：

- **文件生成**：`exceljs` 构建 `Workbook`，单个 `Sheet1`，表头行加粗、全表水平垂直居中、冻结首行，未指定 `width` 的列默认宽 `15`
- **流式输出**：写入 `PassThrough` 流再包 `StreamableFile` 返回，全程不产生临时文件，无需清理
- **单元格取值**：读取兼容字符串、数字、富文本、超链接文本、公式结果、`Date` 对象等形态，空值统一按 `null` 处理，前后空白自动 trim
- **字典转换**：导出前批量预取 `dictType` 对应字典数据做「值 → 标签」转换（找不到对应字典项时该单元格渲染为空字符串），导入时反向「标签 → 值」反查，找不到对应字典项即报错。该能力由 `ExcelModule` 内部依赖 `DictModule` 提供，业务侧无需关心
- **日期处理**：导出按字段 `dateFormat` 格式化；导入不区分各字段的 `dateFormat`，统一逆解析为 `YYYY-MM-DD HH:mm:ss` 存储格式，解析失败按错误处理

## 导出

以登录日志为例，完整导出链路共四步：实体注解 → Service 组装文件流 → Controller 暴露端点 → 前端触发下载。

### 1. Service 组装文件流

按当前查询条件**全量导出**，不拼 `skip` / `take`，与列表接口共用同一份 `where` 构造。调用 `excelService.export(Entity, list)` 得到可读流，再包成 `StreamableFile` 返回：

```typescript
public async exportLogininfo(queryParams: QueryLoginlogDto) {
  const queryBuilder = this.loginlogRepository.createQueryBuilder('logininfor')
  queryBuilder.where(this.buildLoginlogWhere(queryParams))
  queryBuilder.orderBy('logininfor.loginTime', 'DESC')
  const records = await queryBuilder.getMany()
  const fileReadableStream = await this.excelService.export(LoginLogEntity, records)
  // 文件名 encodeURIComponent + filename* 双写，兼容中文与所有浏览器
  const filename = encodeURIComponent(`登录日志-${formatTime(new Date(), 'YYYYMMDDHHmmss')}.xlsx`)
  const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${filename}`
  const type = `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  return new StreamableFile(fileReadableStream, { disposition, type })
}
```

### 2. Controller 暴露端点

```typescript
@SkipTransform() // 必须挂：统一响应转换会破坏二进制流
@Post('loginlog/export')
@RequirePermissions(['monitor:loginlog:export'])
@Operlog({ title: '登录日志', businessType: BusinessType.EXPORT }) // 记录 EXPORT 类型操作日志
public exportLogininfo(@Query(PaginationPipe) queryParams: QueryLoginlogDto) {
  return this.logService.exportLogininfo(queryParams)
}
```

要点：

- `@SkipTransform()` 不能漏，否则文件流会被统一响应结构包裹损坏
- 权限码按惯例为 `<模块>:<实体>:export`
- 导出端点用 `@Post` 携带查询参数，GET 不便携带复杂条件

### 3. 前端请求类

请求方法指定 `responseType: 'blob'`，其余与普通请求一致：

```typescript
// api/monitor/loginlog.request.ts
public static export(params: QueryLoginlog) {
  return request.post('/monitor/log/loginlog/export', {}, { params, responseType: 'blob' })
}
```

### 4. 页面触发下载

从 `content-disposition` 解析文件名后交给 `utils/file.ts` 的 `linkDownload`，按钮按权限码门控并挂 loading 防重复点击：

```typescript
// views/monitor/loginlog/index.vue
async function handleExport() {
  try {
    exportLoading.value = true
    const response = await LoginlogRequest.export(queryParams.value)
    const filenameMatch = response.headers['content-disposition'].match(/filename\*=UTF-8''(.*)/i)
    const filename = decodeURIComponent(filenameMatch[1])
    linkDownload(response.data, filename)
  } finally {
    exportLoading.value = false
  }
}
```

```html
<el-button v-permissions="['monitor:loginlog:export']" :loading="exportLoading" type="warning" plain @click="handleExport">
  <template #icon> <SvgIcon name="Download" /> </template>
  <span>导出</span>
</el-button>
```

## 导入

通用导入层 `ExcelService.import()` 的职责边界是「文件结构校验 + 值逆变换」，**业务校验与入库由调用方负责**：

- 表头强校验：列名、顺序、数量必须与模板完全一致，防止用户篡改模板后列错位
- 字典反查：字典列按「标签 → 值」解析，找不到对应字典项即报错
- 日期逆解析：`dateFormat` 列逆解析为 `YYYY-MM-DD HH:mm:ss` 统一存储格式
- 错误策略**首错即返、全有或全无**：任一行解析失败立即以该行的行号与原因整体驳回（不继续解析后续行），不返回部分数据
- 跳过表头行与全空行，返回 `ImportRow[]`，`rowNumber` 为 Excel 中的真实行号便于错误定位，`data` 为解析后的行对象

### 1. 实体标注仅导入字段

某些列只想出现在导入模板、不参与导出时，用 `type: ExcelType.IMPORT`：

```typescript
@Excel({ name: '初始密码', type: ExcelType.IMPORT })
@Column({ type: 'varchar', length: 100, comment: '密码', default: null })
password: string
```

### 2. 提供模板下载端点

`excelService.importTemplate(Entity)` 按实体 `@Excel` 配置生成导入模板，表头加粗居中、冻结首行、默认列宽 15，字典列还会自动写入下拉数据校验，用户下载后按列填写即可：

```typescript
@SkipTransform()
@Post('importTemplate')
@RequirePermissions(['system:user:import'])
public importTemplate() {
  return this.userService.importTemplate()
}
```

```typescript
public async importTemplate() {
  const fileReadableStream = await this.excelService.importTemplate(UserEntity)
  const filename = encodeURIComponent(`用户导入模板.xlsx`)
  const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${filename}`
  const type = `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  return new StreamableFile(fileReadableStream, { disposition, type })
}
```

### 3. 提供导入端点

模板的用户管理已内置完整导入链路，可直接作为参考实现（`user.controller.ts`）。导入端点除文件外还接收 `ImportUserDto`（`updateSupport` 控制是否覆盖已存在数据，另可指定默认 `deptId` 与 `roleIds`）：

```typescript
/** 导入用户（file 为 xlsx 文件；updateSupport 控制是否覆盖已存在用户） */
@Post('importData')
@RequirePermissions(['system:user:import'])
@Operlog({ title: '用户管理', businessType: BusinessType.IMPORT })
@UseInterceptors(FileInterceptor('file'))
public importData(@UploadedFile() file: ExpressMulterFile, @Body() importDto: ImportUserDto) {
  return this.userService.importData(file, importDto)
}
```

### 4. Service 解析与入库

`import()` 返回的行数据未做业务校验，跳过还是覆盖已存在数据由业务层决定。参考 `user.service.ts` 的 `importData`：按 `username` 查出已存在数据，`updateSupport` 为真时覆盖更新（仅更新资料字段，不改动密码/部门/角色，管理员账号禁止被导入修改），否则跳过，最后返回「导入成功：新增 X 条、更新 Y 条」：

```typescript
public async importData(file: ExpressMulterFile, importDto: ImportUserDto) {
  const rows = await this.excelService.import(UserEntity, file) // 只解析不校验不入库
  // 按 username 分流：已存在的按 updateSupport 决定覆盖或跳过，其余新增
  // ...（略，完整实现见 user.service.ts）
  return `导入成功：新增 ${createdCount} 条、更新 ${updatedCount} 条`
}
```

### 5. 前端上传

用 `FormData` 携带文件，`el-upload` 只做文件选择，提交前校验文件已选：

```vue
<el-upload action="#" :auto-upload="false" :limit="1" accept=".xlsx" :on-change="(file) => (uploadFile = file.raw)">
  <el-button>选择文件</el-button>
</el-upload>
```

```typescript
// api/system/user.request.ts —— 不要手动设置 Content-Type，浏览器自动带 boundary
public static importData(data: FormData): Promise<string> {
  return request.post('/system/user/importData', data)
}
```

```typescript
async function handleImport() {
  if (!uploadFile.value) return TipModal.msgWarning('请先选择文件')
  const formData = new FormData()
  formData.append('file', uploadFile.value)
  // 还可按需追加 updateSupport / deptId / roleIds
  const message = await UserRequest.importData(formData)
  TipModal.msgSuccess(message)
}
```

## 错误处理与反馈

导入链路的失败反馈全部走统一响应结构，前端无需特殊处理：

- **模板不一致**：直接驳回，提示「导入文件与模板不一致，请下载最新模板后填写」
- **行级解析失败**：字典标签不存在、日期格式错误等按「首错即返」策略驳回，错误信息带 Excel 真实行号定位，如「第 3 行：操作类型「8」不存在」
- **全部驳回不部分成功**：存在任何解析错误时不会入库任何一行，用户修正后重新上传即可，无需担心脏数据残留

## 设计取舍

导入导出在实现上有几个明确的取舍：

- **流式输出不落盘**：文件经 `PassThrough` 流直接返回给客户端，全程不产生临时文件。临时文件方案在用户使用下载工具二次请求时会出现文件已被清理的异常，流式方案不存在这个问题
- **解析与入库分离**：导入只负责解析与结构校验，业务校验、跳过还是覆盖已存在数据由业务层决定——每张表的唯一键不同，通用层不该替业务做主
- **全有或全无**：任何一行解析失败即整体驳回，杜绝部分成功造成的脏数据残留
- **表头强校验**：列名、顺序、数量必须与模板完全一致，用户篡改模板导致列错位的问题在入口即被拦截
- **样式聚焦可读性**：表头加粗、全表居中、冻结首行、合理列宽，满足中后台数据交互场景；不提供单元格级的样式编排，保持配置面精简

需要多 Sheet 导出、关联子对象展开、子列表合并单元格、按值动态样式等高级场景时，基于 `exceljs` 在 `ExcelService` 上扩展即可。

## 依赖说明

业务模块使用导入导出时，在其模块中引入 `ExcelModule` 即可注入 `ExcelService`。字典转换能力由 `ExcelModule` 内部依赖 `DictModule` 完成，无需业务侧关心。
