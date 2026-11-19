# 数据权限

接口权限码解决「能不能调」，数据权限解决「能看、能改哪些部门的数据」。模板的做法同样是注解驱动：Controller 方法标注 `@DataScope`，拦截器按当前用户角色计算过滤条件，`@DataScopeSql()` 注入 Service 后拼进 QueryBuilder。数据范围在角色管理中按角色配置，无需在业务代码里写死谁能看什么。参考实现：用户管理列表与写操作。

## 数据范围档位

在角色管理中为角色选择数据范围，取值由 `common/constant/rbac.constant.ts` 的 `DataScopeType` 划分：

| 值 | 常量 | 含义 |
| --- | --- | --- |
| `1` | `ALL` | 全部数据，不做过滤 |
| `2` | `CUSTOM` | 自定义数据，按角色勾选的部门集合过滤 |
| `3` | `DEPT` | 仅本部门，主部门与附属部门，不含子部门 |
| `4` | `DEPT_AND_BELOW` | 本部门及以下，含全部子孙部门 |
| `5` | `SELF` | 仅本人，按创建人匹配 |

超级管理员角色编码为 `admin`，其数据范围配置为「全部数据」时接口不做任何过滤。

## 使用三步

### 1. 配置角色数据范围

在角色管理中编辑角色的数据范围，选择「自定义」时还需勾选可见部门集合。

### 2. Controller 标注并注入条件

方法标注 `@DataScope`，用 `@DataScopeSql()` 把计算好的条件注入为参数：

```typescript
/** 查询用户分页列表（按部门数据范围过滤） */
@Get('list')
@RequirePermissions(['system:user:query'])
@DataScope({ alias: 'user', userColumn: 'id' })
public findList(@Query(PaginationPipe) queryParams: QueryUserDto, @DataScopeSql() ds: DataScopeCondition) {
  return this.userService.findList(queryParams, ds)
}
```

### 3. Service 拼进 QueryBuilder

`ds` 直接交给 `andWhere`，`ds` 为 `undefined` 表示不过滤，如全部数据权限：

```typescript
public async findList(queryParams: QueryUserDto, ds?: DataScopeCondition) {
  const queryBuilder = this.userRepository.createQueryBuilder('user')
  /* ...业务筛选条件... */
  // 数据权限过滤，ds 为 undefined 表示无过滤，如超管
  if (ds) queryBuilder.andWhere(ds.sql, ds.params)
  const [records, total] = await queryBuilder.getManyAndCount()
  return { total, records }
}
```

最终生成的过滤条件形如 `user.deptId IN (:...__ds0)` 或 `user.id = :__dsu0`，多档位之间用 OR 合并后包一层括号。

## 写操作同样受数据权限保护

列表过滤只解决「能查到哪些」，拿到列表之外的 id 仍可以直接调修改或删除接口。因此写操作也要标注数据权限，并在落库前校验目标数据是否落在范围内：

```typescript
/** 编辑用户：写操作同样注入数据权限条件 */
@Put('update')
@RequirePermissions(['system:user:update'])
@DataScope({ alias: 'user', userColumn: 'id' })
@Operlog({ title: '用户管理', businessType: BusinessType.UPDATE })
public update(@Body() updateDto: UpdateUserDto, @DataScopeSql() ds: DataScopeCondition) {
  return this.userService.update(updateDto, ds)
}
```

Service 侧用统一方法校验，目标数据有一条不在范围内就整体驳回：

```typescript
/** 数据权限校验：目标用户必须全部落在 ds 范围内；ds 为 undefined（超管）直接放行 */
private async assertInScope(targetIds: string[], ds?: DataScopeCondition): Promise<void> {
  if (!ds) return
  const uniqueIds = [...new Set(targetIds)]
  if (!uniqueIds.length) return
  const queryBuilder = this.userRepository.createQueryBuilder('user')
  queryBuilder.where('user.id IN (:...targetIds)', { targetIds: uniqueIds })
  queryBuilder.andWhere(ds.sql, ds.params)
  const visibleCount = await queryBuilder.getCount()
  if (visibleCount !== uniqueIds.length) throw new BusinessException('数据不存在或无权访问')
}
```

- 删除、修改、详情回显都走这套校验，前端不需要额外判断
- 校验失败统一抛「数据不存在或无权访问」，不泄露目标数据是否存在
- 与列表一致，条件全部参数化，缓存缺失时 fail-closed 为 `1 = 0`，写操作随之一并拒绝

## @DataScope 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `alias` | `user` | QueryBuilder 主表别名，须与 Service 中的别名一致 |
| `deptColumn` | `deptId` | 部门列名，按部门过滤时匹配的列 |
| `userColumn` | `createBy` | 仅本人时匹配的列，用户表请显式传 `id` |

三个参数都有默认值，业务表字段命名贴合约定时可以零配置使用，如 `@DataScope()`。

## 实现机制

条件计算由 `DataScopeInterceptor` 完成，在 `app.module.ts` 中以 `APP_INTERCEPTOR` 全局注册：

- **无注解即跳过**：`Reflector` 读取元数据，方法优先于类，未标注的请求直接放行
- **先计算再放行**：通过 `concat` 保证条件先挂载到 `request.dataScope`，再进入 Controller
- **参数化防注入**：条件全部走占位符参数，如 `IN (:...__ds0)`，不拼接任何字面值
- **多角色取并集**：用户拥有多个角色时，各角色档位生成的条件以 OR 合并，语义取最宽松；任一角色为「全部数据」则整体不过滤
- **fail-closed**：用户角色缓存、角色数据范围缓存、部门信息任一缺失或计算异常，一律按 `1 = 0` 处理，宁可查空绝不放行全量

过滤条件的输入来自 Redis 缓存，写入方与 TTL 策略如下：

| 缓存 | 写入方 | 内容 |
| --- | --- | --- |
| `user:roles:{userId}` | 登录时 `getInfo` 写入 | 用户角色列表 |
| `sys:role:depts:{roleId}` | `RoleService` 在角色变更时重建 | 角色数据范围与自定义部门集合 |
| `user:depts:{userId}` | 登录时 `getInfo` 写入 | 用户可见部门 |

角色数据范围缓存读时续期，TTL 与 JWT 过期时间同源，避免活跃会话中途缓存过期导致列表被 fail-closed 查空。

## 接入要求

- 业务表需要有部门列或创建人列，默认约定为 `deptId` 与 `createBy`，不一致时通过装饰器参数指定
- QueryBuilder 主表别名必须与 `alias` 一致，别名对不上条件不会生效
- `@DataScopeSql()` 与 `@DataScope` 成对使用：只标注 `@DataScope` 而不注入条件，过滤不会发生
- 列表与写操作分开标注：只给列表加数据权限，等于把修改、删除、详情接口暴露在权限范围之外
