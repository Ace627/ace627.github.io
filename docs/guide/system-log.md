# 系统日志

关键业务操作需要留痕，但逐个方法手动收集参数、写日志会让业务代码堆满重复。模板的做法是注解驱动：Controller 方法上加 `@Operlog` 装饰器，日志由全局拦截器自动记录，业务代码只保留业务本身。登录成功与失败则由登录流程自动记录为登录日志。两套日志同属 `modules/monitor/log`，查询页在系统监控下。

## @Operlog 装饰器

在需要留痕的 Controller 方法上标注：

```typescript
@Operlog({ title: '用户管理', businessType: BusinessType.INSERT })
@Post('create')
@RequirePermissions(['system:user:create'])
public createUser(@Body() createDto: CreateUserDto) {
  return this.userService.createUser(createDto)
}
```

参数说明：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | - | 必填，操作模块，对应日志中的模块标题 |
| `businessType` | `BusinessType` | `OTHER` | 操作类型，见下表 |

操作类型由 `common/constant/business-type.constant.ts` 的 `BusinessType` 常量划分：

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `OTHER` | `0` | 其它 |
| `INSERT` | `1` | 新增 |
| `UPDATE` | `2` | 修改 |
| `DELETE` | `3` | 删除 |
| `CLEAR` | `4` | 清空 |
| `FORCE_LOGOUT` | `5` | 强退 |
| `IMPORT` | `6` | 导入 |
| `EXPORT` | `7` | 导出 |
| `UNLOCK` | `8` | 解锁 |
| `UPLOAD` | `9` | 上传 |
| `GRANT` | `10` | 授权 |

## 记录机制

日志记录由 `OperlogInterceptor` 完成，在 `app.module.ts` 中以 `APP_INTERCEPTOR` 全局注册，对全部请求生效：

- **无注解即跳过**：拦截器用 `Reflector` 读取方法上的 `@Operlog` 元数据，没有标注的请求直接放行，零开销
- **成功与失败都记录**：`tap` 同时挂 next 与 error，请求抛异常时先经 `AllExceptionsFilter.analyzeException` 统一判定，再按失败状态落库
- **异步落库**：`createOperLog` 不阻塞请求响应，落库失败只打印错误日志，不影响业务结果

每条记录包含以下字段：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `title` | 注解 | 操作模块 |
| `businessType` | 注解 | 操作类型 |
| `status` | 响应结果 | 正常或异常，`StreamableFile` 文件流响应视为正常 |
| `duration` | 请求上下文 | 请求耗时毫秒数，从请求开始时间戳计算 |
| `username` / `userId` | JWT 载荷 | 操作人 |
| `params` | 请求 | query 与 body 合并后格式化存储，详情弹窗查看 |
| `method` | 执行上下文 | Controller 类名.方法名 |
| `url` / `requestMethod` | 请求 | 请求路径与请求方式 |
| `ip` / `location` | 请求 | 请求 IP 与归属地 |
| `requestId` | 请求上下文 | 请求唯一标识，与登录日志共用，可用于全链路关联 |
| `operTime` | 当前时间 | 操作时间 |

## 扩展操作类型

内置十一种操作类型不够用时，三步扩展（新值从 `11` 起编，避免与内置值冲突）：

1. 在 `BusinessType` 中新增常量：

```typescript
/** 测试 */
static TEST = '11'
```

2. 在字典管理中给 `sys_oper_type` 字典新增一条数据，标签「测试」，值 `11`，日志页的操作类型列由该字典渲染
3. Controller 中直接使用：

```typescript
@Operlog({ title: '用户管理', businessType: BusinessType.TEST })
```

## 登录日志

登录日志不需要任何配置，登录成功与失败都由 `auth.service` 自动调用 `logService.createLoginlog` 记录：

- 记录用户账号、登录 IP、归属地、浏览器与操作系统、登录状态、提示消息与登录时间
- 浏览器与操作系统由 UserAgent 安全解析得出，无法解析时记 unknown
- 登录成功的记录会同时写入 Redis 在线用户会话，供在线用户模块查询与强退

## 查询与维护

两套日志的查询能力对称，权限码分别为 `monitor:operlog:*` 与 `monitor:loginlog:*`。

操作日志：

| 操作 | 方法 | 路径 |
| --- | --- | --- |
| 分页查询 | GET | `/monitor/log/operlog/list` |
| 导出 | POST | `/monitor/log/operlog/export` |
| 删除 | DELETE | `/monitor/log/operlog/delete` |
| 清空 | DELETE | `/monitor/log/operlog/clear` |

登录日志：

| 操作 | 方法 | 路径 |
| --- | --- | --- |
| 分页查询 | GET | `/monitor/log/loginlog/list` |
| 导出 | POST | `/monitor/log/loginlog/export` |
| 删除 | DELETE | `/monitor/log/loginlog/delete` |
| 清空 | DELETE | `/monitor/log/loginlog/clear` |

前端列表页支持按模块标题、操作人、IP、状态等条件筛选，操作日志点击详情可在弹窗中查看完整请求参数，日志导出基于通用 Excel 能力实现，见 [导入导出](./excel)。
