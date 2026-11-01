# 接口限流

限流防止接口被滥用刷爆：同一 IP 对同一接口在时间窗口内的请求次数超过阈值后临时拉黑。模板在守卫层内置了基于 Redis 的固定窗口限流，全部接口默认受保护，个别高频接口用装饰器豁免。参考实现：`common/guard/throttler-limit.guard.ts`。

## 限流规则

| 配置 | 值 | 说明 |
| --- | --- | --- |
| 计数维度 | IP + 接口路径 | 同一 IP 访问不同接口分别计数，互不影响 |
| 时间窗口 | 10 秒 | 窗口内累计计数，到期自动清零 |
| 次数阈值 | 10 次 | 窗口内第 11 次起触发拉黑 |
| 拉黑时长 | 60 秒 | 触发后该 IP 访问该接口一律驳回，期间无需再计数 |
| 驳回提示 | 请求过于频繁，请稍后再试 | 业务异常，状态码 400 |

## 实现机制

- **全局守卫**：`ThrottlerLimitGuard` 在 `app.module.ts` 中以 `APP_GUARD` 注册，是守卫链的第一环，登录前即可生效
- **原子计数**：计数用 Redis `INCR` 原子自增，首次请求才设置过期时间，高并发下计数准确
- **拉黑状态机**：计数超限后键值改写为 `locked` 并设置拉黑时长，期间的请求直接短路驳回，不再累加计数
- **内容安全**：计数不涉及请求内容解析，无序列化开销，对静态资源类高频接口同样生效

## 豁免限流

高频或特殊接口用 `@SkipThrottle()` 豁免，方法与控制器均可标注，方法优先：

```typescript
/** 获取图片验证码：前端轮询与刷新场景高频调用，豁免限流 */
@Public()
@SkipThrottle()
@Get('captcha')
public getCaptcha() {
  return this.authService.getCaptcha()
}
```

内置豁免点：图片验证码、用户信息获取、刷新令牌（并发 401 时排队重放，高频触发）、分片上传。分片上传单文件会产生大量分片请求，不豁免会被正常业务触发拉黑：

```typescript
@SkipThrottle()
@Post('chunk')
@UseInterceptors(AnyFilesInterceptor())
public uploadChunk(@UploadedFiles() files: ExpressMulterFile[], @Body() body: UploadChunkDto) {
  return this.uploadService.uploadChunk(files, body)
}
```

## 调整阈值

三个阈值目前是守卫内的类常量，需要调整时修改 `ThrottlerLimitGuard` 顶部定义：

```typescript
private readonly MAX_REQUEST_COUNT: number = 10      // 最大允许请求次数
private readonly LIMIT_WINDOW_SECONDS: number = 10   // 限流时间窗口，秒
private readonly LOCK_DURATION_SECONDS: number = 60 * 1 // 触发限流后拉黑时长，秒
```

## 注意事项

- 限流按 IP 统计，办公网络出口共享 IP 时多用户合计计数，阈值调整需考虑实际部署场景
- 限流先于鉴权执行，未登录的恶意请求同样被计数与拉黑，登录、验证码等公开接口无需额外防护
- 豁免装饰器只关掉限流，不豁免防重复提交与鉴权，需要时另行组合
