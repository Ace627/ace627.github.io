# 增删改查

一个业务模块的完整增删改查由「后端三件套：DTO 校验、Controller 端点、Service 逻辑」与「前端三件套：请求类、列表页、编辑弹窗」组成。本页以系统用户模块为参考实现，照此结构可以复制出任一业务模块。

## 接口约定

一套标准的增删改查对应五个端点，权限码按操作划分：

| 操作 | 方法 | 路径 | 权限码 | 操作日志 |
| --- | --- | --- | --- | --- |
| 新增 | POST | `/system/user/create` | `system:user:create` | INSERT |
| 删除 | DELETE | `/system/user/delete` | `system:user:delete` | DELETE |
| 修改 | PUT | `/system/user/update` | `system:user:update` | UPDATE |
| 列表 | GET | `/system/user/list` | `system:user:query` | - |
| 详情 | GET | `/system/user/detail` | `system:user:query` | - |

## 后端实现

### 1. 定义 DTO

```typescript
import { PaginationDto } from '@/common'
import { Exclude } from 'class-transformer'
import { PartialType } from '@nestjs/mapped-types'
import { IsArray, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

/** 新增用户 */
export class CreateUserDto {
  @IsNotEmpty({ message: '参数 $property 不能为空' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, { message: '用户账号须以字母开头、仅含字母与数字' })
  username: string

  @IsNotEmpty({ message: '参数 $property 不能为空' })
  password: string

  @IsArray()
  @IsNotEmpty({ message: '参数 $property 不可为空' })
  roleIds: string[]

  @IsNotEmpty({ message: '参数 $property 不能为空' })
  @IsString()
  deptId: string

  @IsOptional()
  nickname: string

  @IsOptional()
  phone: string
  // ... 其余可选字段同理
}

/** 编辑用户：继承新增的全部校验规则，仅必填字段收窄为 id 与 roleIds */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty({ message: '参数 $property 不可为空' })
  id: string

  @IsNotEmpty({ message: '参数 $property 不可为空' })
  roleIds: string[]

  /** 账号与密码不允许走编辑接口修改 */
  @Exclude()
  username: string

  @Exclude()
  password: string
}

/** 查询用户：继承 PaginationDto 获得分页参数（pageNo / pageSize） */
export class QueryUserDto extends PaginationDto {
  @IsOptional()
  username: string

  @IsOptional()
  status: string
}
```

要点：

- 编辑 DTO 用 `PartialType(CreateUserDto)` 复用新增的校验规则，不重复声明
- `@Exclude()` 拦截 `username / password`，即使前端恶意提交也不会改掉账号或密码
- 查询 DTO 继承 `PaginationDto`，列表接口自动获得分页参数与校验

### 2. 编写 Controller

```typescript
@Controller('system/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** 新建用户 */
  @Post('create')
  @RequirePermissions(['system:user:create'])
  @Operlog({ title: '用户管理', businessType: BusinessType.INSERT })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto)
  }

  /** 删除用户（单个或批量，ids 为逗号拼接字符串） */
  @Delete('delete')
  @RequirePermissions(['system:user:delete'])
  @Operlog({ title: '用户管理', businessType: BusinessType.DELETE })
  public delete(@Query('ids', new ParseArrayPipe()) ids: string[]) {
    return this.userService.delete(ids)
  }

  /** 编辑用户 */
  @Put('update')
  @RequirePermissions(['system:user:update'])
  @Operlog({ title: '用户管理', businessType: BusinessType.UPDATE })
  update(@Body() updateDto: UpdateUserDto) {
    return this.userService.update(updateDto)
  }

  /** 查询用户分页列表 */
  @Get('list')
  @RequirePermissions(['system:user:query'])
  public findList(@Query(PaginationPipe) queryParams: QueryUserDto) {
    return this.userService.findList(queryParams)
  }

  /** 根据 ID 查询用户详情（编辑回显用） */
  @Get('detail')
  @RequirePermissions(['system:user:query'])
  public findOneById(@Query('id') id: string) {
    return this.userService.findOneById(id)
  }
}
```

要点：

- 每个写操作挂 `@RequirePermissions` 权限码与 `@Operlog` 操作日志，与前端按钮的 `v-permissions` 一一对应
- 删除接口用 `ParseArrayPipe` 把 `?ids=1,2,3` 逗号串直接转成数组，天然支持单删与批删
- 列表接口的 `PaginationPipe` 自动把 `pageNo / pageSize` 换算为 `skip / take`，详见下文[分页实现](#分页实现)

### 3. 实现 Service

```typescript
/** 创建用户：唯一性校验 → 密码加密 → 关联角色 → 落库 */
public async create(createDto: CreateUserDto) {
  const { username, phone, email, roleIds } = createDto
  if (await this.userRepository.existsBy({ username: Equal(username) })) throw new BusinessException('该用户已存在')
  if (await this.checkPhoneExists(phone)) throw new BusinessException('该手机号已存在')
  if (await this.checkEmailExists(email)) throw new BusinessException('该邮箱已存在')

  const entity = new UserEntity()
  Object.assign(entity, createDto)
  entity.password = await encryptPassword(createDto.password)
  entity.roles = await this.roleRepository.findBy({ id: In(roleIds) })
  await this.userRepository.save(entity)
  return '添加成功'
}

/** 删除用户：清理中间表 + 软删除 */
public async delete(userIds: string[]) {
  const targets = await this.userRepository.findBy({ id: In(userIds) })
  if (targets.length !== new Set(userIds).size) throw new BusinessException('该用户不存在')
  // 持有超管角色的账号禁止删除
  // ...（略）
  await this.dataSource.createQueryBuilder().delete().from('sys_user_role').where('user_id IN (:...ids)', { ids: userIds }).execute()
  await this.userRepository.softDelete(userIds)
  return '删除成功'
}

/** 编辑用户：排他性校验（排除自身）→ 同步角色关联 */
public async update(updateDto: UpdateUserDto) {
  const { id, phone, email, roleIds } = updateDto
  const entity = await this.userRepository.findOneBy({ id: Equal(id) })
  if (!entity) throw new BusinessException('该用户不存在')
  if (await this.checkPhoneExists(phone, id)) throw new BusinessException('该手机号已存在')
  if (await this.checkEmailExists(email, id)) throw new BusinessException('该邮箱已存在')

  if (roleIds) entity.roles = await this.roleRepository.findBy({ id: In(roleIds) })
  Object.assign(entity, updateDto)
  await this.userRepository.save(entity)
  return '更新成功'
}

/** 查询用户分页列表 */
public async findList(queryParams: QueryUserDto) {
  const { skip, take, status, username } = queryParams
  const queryBuilder = this.userRepository.createQueryBuilder('user')
  if (username) queryBuilder.andWhere('user.username LIKE :username', { username: `%${username}%` })
  if (status) queryBuilder.andWhere('user.status = :status', { status })

  queryBuilder.orderBy('user.createTime', 'ASC') // 排序
  queryBuilder.skip(skip).take(take) // 分页
  const [records, total] = await queryBuilder.getManyAndCount()
  return { total, records }
}
```

要点：

- 唯一性校验（账号 / 手机 / 邮箱）在 Service 显式进行并抛 `BusinessException`，编辑场景的校验方法多传一个 `id` 用于排除自身
- 密码必须 `encryptPassword` 加密后落库
- 删除走 `softDelete` 软删除，多对多中间表关系需手动清理
- 返回字符串提示（「添加成功」等）经全局拦截器包装为统一 `AjaxResult` 结构
- 上文列表查询是简化示意；实际用户模块还含部门子树过滤（选中部门时连同下级部门一起查询），见 `user.service.ts`

## 前端实现

### 1. 定义请求类

与后端端点一一对应（`apps/admin/src/api/system/user.request.ts`）：

```typescript
import { request } from '@/utils/request'
import type { User } from '@/types'

export class UserRequest {
  /** 新建用户 */
  static create(data: User.UserForm): Promise<string> {
    return request.post('/system/user/create', data)
  }

  /** 批量删除用户（ids 为逗号拼接字符串，后端 ParseArrayPipe 接收） */
  static delete(params: { ids: string }): Promise<string> {
    return request.delete('/system/user/delete', { params })
  }

  /** 编辑用户（username/password 由后端 @Exclude 拦截，不会生效） */
  static update(data: User.UserForm): Promise<string> {
    return request.put('/system/user/update', data)
  }

  /** 查询用户分页列表 */
  static findList(params: User.UserQuery): PaginationResult<User.SysUser> {
    return request.get('/system/user/list', { params })
  }

  /** 根据 id 查找用户详情（含关联角色，用于回填 roleIds） */
  static findDetail(params: { id: string }): Promise<User.SysUser> {
    return request.get('/system/user/detail', { params })
  }
}
```

### 2. 列表页

`ProSearch`（搜索）+ 操作按钮 + `ProTable`（表格）+ `ProPagination`（分页）四件套（`apps/admin/src/views/system/user/index.vue`）：

```vue
<ProSearch v-permissions="['system:user:query']" :items="items" v-model="queryParams" @query="handleQuery" @reset="resetQuery" />

<el-button v-permissions="['system:user:create']" plain type="primary" @click="handleCreate">新增</el-button>
<el-button v-permissions="['system:user:delete']" plain type="danger" :disabled="!isMultiple" @click="handleDelete()">批量删除</el-button>

<ProTable ref="tableRef" v-loading="loading" :data="list" :columns="columns" @selection-change="handleSelectionChange">
  <template #action="{ row }">
    <el-link v-permissions="['system:user:update']" type="primary" @click="handleEdit(row)">修改</el-link>
    <el-link v-permissions="['system:user:delete']" type="primary" @click="handleDelete(row)">删除</el-link>
  </template>
</ProTable>

<ProPagination :total v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize" @pagination="getList" />
```

```typescript
const queryParams = ref<User.UserQuery>({ pageNo: 1, pageSize: 10 })
const list = ref<User.SysUser[]>([])
const multipleSelection = ref<User.SysUser[]>([])

/** 列表查询 */
async function getList() {
  try {
    loading.value = true
    const data = await UserRequest.findList(queryParams.value)
    list.value = data.records
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索：重置页码，避免停留在超出结果的页号 */
function handleQuery() {
  if (loading.value) return TipModal.msgWarning('正在查询中，请勿重复操作')
  queryParams.value.pageNo = 1
  getList()
}

/** 删除：传 row 为单删，不传为批删（多选） */
async function handleDelete(row?: User.SysUser) {
  const { cancel } = await TipModal.confirm('确定要删除选中的数据吗？')
  if (cancel) return TipModal.msgWarning('操作取消')
  const ids = row ? row.id : multipleSelection.value.map((i) => i.id).join(',')
  await UserRequest.delete({ ids })
  // 删除当前页最后一条数据后页码回退一位再刷新
  if (list.value.length <= 1) queryParams.value.pageNo = queryParams.value.pageNo > 1 ? queryParams.value.pageNo - 1 : 1
  await getList()
  TipModal.msgSuccess('删除成功')
}
```

要点：

- 按钮与行内链接用 `v-permissions` 按权限码门控，与后端 `@RequirePermissions` 一一对应
- 单删与批删共用 `handleDelete`：`@click="handleDelete()"` 不传参走多选，`@click="handleDelete(row)"` 传行数据走单删
- 搜索 / 重置后把 `pageNo` 重置为 1，删除末条后回退页码

### 3. 编辑弹窗

新增与编辑共用一个弹窗组件，以 `form.id` 区分模式（`apps/admin/src/views/system/user/components/UserDialog.vue`）：

```typescript
const visible = ref(false)
const form = ref<User.UserForm>({})
const isEdit = computed(() => !!form.value.id)
const dialogTitle = computed(() => (isEdit.value ? '修改用户' : '新增用户'))

/** 打开弹窗（传 record 为编辑模式，不传为新增模式；defaultDeptId 为新增时默认所属部门），父组件通过 ref 调用 */
async function open(record?: User.SysUser, defaultDeptId?: string) {
  visible.value = true
  await Promise.all([resetForm(record?.id, defaultDeptId), loadSelectData()])
}

/** 编辑时回填详情并将关联角色映射为 roleIds；新增时恢复默认值（初始密码读自系统参数） */
async function resetForm(userId?: string, defaultDeptId?: string) {
  if (userId) {
    const data = await UserRequest.findDetail({ id: userId })
    form.value = { ...data, roleIds: (data.roles ?? []).map((item) => item.id) }
  } else {
    form.value = { status: '1', gender: '2', password: initPassword.value, deptId: defaultDeptId }
  }
}

/** 提交：按 isEdit 分流 create / update */
async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  submitting.value = true
  if (isEdit.value) {
    const { username: _u, password: _p, ...updateForm } = form.value
    await UserRequest.update(updateForm)
  } else {
    await UserRequest.create(form.value)
  }
  closeDialog()
  emits('getList') // 通知父组件刷新列表
  TipModal.msgSuccess(isEdit.value ? '修改成功' : '新增成功')
  submitting.value = false
}

defineExpose({ open })
```

父组件挂载弹窗并通过模板 ref 调用：

```vue
<UserDialog ref="userDialogRef" @getList="getList" />
```

```typescript
const userDialogRef = useTemplateRef('userDialogRef')

function handleCreate() {
  userDialogRef.value?.open()
}
function handleEdit(row: User.SysUser) {
  userDialogRef.value?.open(row)
}
```

要点：

- 编辑回显走 `detail` 接口而非直接用行数据，保证拿到完整关联数据（如角色列表映射为 `roleIds`）
- 编辑提交时前端剔除 `username / password`，与后端 `@Exclude` 形成双保险
- 弹窗内成功后 `emits('getList')` 交给父组件刷新列表，弹窗不持有列表状态

## 分页实现

分页参数的解析与换算由两个通用类完成，业务代码无需重复编写：

- `PaginationDto`（`apps/server/src/common/dto/pagination.dto.ts`）：声明 `pageNo / pageSize` 并做数字类型校验，同时预留数据库层面的 `skip / take` 字段
- `PaginationPipe`（`apps/server/src/common/pipe/pagination.pipe.ts`）：读取请求中的 `pageNo / pageSize`（缺省为第 1 页、每页 10 条），按 `skip = (pageNo - 1) * pageSize`、`take = pageSize` 换算后挂回参数对象

即：请求参数 `pageNo=2, pageSize=10` 会被换算为 `skip=10, take=10` 交给查询构造器。

前端侧由 `ProPagination` 组件承接（`apps/admin/src/components/ProPagination/index.vue`）：

| 特性 | 说明 |
| --- | --- |
| 双向绑定 | `v-model:current-page` 对应 `pageNo`、`v-model:page-size` 对应 `pageSize` |
| 统一事件 | 页码或每页条数变化时只触发 `@pagination`，页面挂同一个 `getList` 即可 |
| 每页条数选项 | 默认 `[10, 20, 30, 40, 50]`，可通过 `pageSizeList` 覆盖 |
| 末页收敛 | 切大每页条数导致当前页越界时自动回退到合法页码 |
| 移动端适配 | 小屏自动精简 layout 为 `total, prev, jumper, next`、页码按钮减为 5 个 |

::: tip 设计说明
本项目不做分页插件的隐式封装，而是显式管道换算 + TypeORM `skip / take`，分页参数的流向（query → skip/take → SQL）全部可见，无隐式状态。
:::
