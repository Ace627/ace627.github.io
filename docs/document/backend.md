# 后端手册

## 装饰器 / 注解

多个装饰器堆叠时的执行顺序（请求进来先走 Guard，再走 Interceptor）

### @Public

用于标记一个路由为公共路由，即不需要登录即可访问。

```typescript
import { Public } from '@/common'

@Public()
@Get('/public')
publicRoute() {
 return 'Public route';
}
```

### @RequirePermissions

声明接口所需的权限标识，传入权限码数组。请求时用户只需拥有 其中一个 权限即可通过。

```typescript
import { RequirePermissions } from '@/common'

@RequirePermissions(['system:user:create'])
@Post('create')
create(@Body() createDto: CreateUserDto) {
  return this.userService.create(createDto)
}
```

### @OperLog

记接口需要记录操作日志。 title 必填， businessType 默认 OTHER 。

```typescript
import { OperLog, BusinessType } from '@/common'

@OperLog({ title: '用户管理', businessType: BusinessType.INSERT })
@Post('create')
create(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto)
}
```

### @CurrentUser

参数装饰器，直接注入在控制器方法参数上，用于获取当前登录用户信息。

```typescript
import { CurrentUser } from '@/common'

@Get('profile')
getProfile(@CurrentUser() user: AuthType.JwtPayload) {
  return this.userService.getProfile(user.userId)
}

// 获取指定字段
@Put('updatePassword')
updatePassword(@CurrentUser('userId') userId: string, @Body() dto: UpdateUserPwdDto) {
  return this.userService.updatePassword(userId, dto)
}
```

### @SkipTransform

跳过全局响应格式包装，直接返回原始数据。常用于文件导出接口。

```typescript
import { SkipTransform } from '@/common'

@SkipTransform()
@Post('export')
exportLog() {
  return this.logService.exportLog()
}
```

### @ResponseCache

对接口响应进行 Redis 缓存。 key 不传则默认 类名:方法名 ， ttl 不传默认 60 秒（实际 TTL 会加 20% 随机抖动防缓存雪崩）。

```typescript
import { ResponseCache } from '@/common'
import { ResponseCache } from '@/common'

@ResponseCache({ ttl: 180 })
@Get()
getServer() {
  return this.serverService.getInfo()
}
```

### @SkipThrottle

跳过全局接口限流保护。适用于高频调用接口（如分片上传）。

```typescript
import { SkipThrottle } from '@/common'

@SkipThrottle()
@Post('chunk')
uploadChunk(@UploadedFiles() files: ExpressMulterFile[]) {
  return this.uploadService.uploadChunk(files)
}
```

### @Excel

类属性装饰器，标记实体字段在 Excel 导出/导入时的列配置。支持同一属性多次装饰（累加）。

```typescript
import { Excel } from '@/common'

export class JobLogEntity extends BaseEntity {
  @Excel({ name: '任务名称', width: 30 })
  @Column({ name: 'job_name', length: 64 })
  jobName: string

  @Excel({ name: '任务组名' })
  @Column({ name: 'job_group', length: 64 })
  jobGroup: string

  @Excel({ name: '状态', dictType: 'sys_common_status' })
  @Column({ name: 'status', type: 'char', length: 1 })
  status: string

  @Excel({ name: '创建时间', width: 25 })
  @Column({ name: 'create_time' })
  createTime: Date
}
```
