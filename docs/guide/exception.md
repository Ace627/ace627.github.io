# 异常处理

Web 项目里有大量需要处理的异常：业务校验失败、权限不足、资源不存在……如果每处都用 try/catch 包裹，代码会重复且臃肿。本项目的原则是：**业务代码只负责抛出异常，兜底转换交给全局异常处理器**，业务代码里不再出现任何响应包装样板。

整体链路分三层：

```
Service 抛出异常 → 全局异常过滤器捕获并翻译 → 前端拦截器统一弹错
```

## 业务异常

业务异常类（`apps/server/src/common/exception/business.exception.ts`）继承 NestJS 内置 `HttpException`，支持自定义错误码与提示消息：

```typescript
import { BusinessException } from '@/common'

// 唯一性校验失败
if (await this.userRepository.existsBy({ username: Equal(username) })) {
  throw new BusinessException('该用户已存在')
}

// 自定义错误码
throw new BusinessException('参数错误', 400)
```

错误码语义：

| 写法 | 业务错误码 code | HTTP 状态码 |
| --- | --- | --- |
| `throw new BusinessException('msg')` | 默认 500 | 默认 200 |
| `throw new BusinessException('msg', 400)` | 400 | 400 |

即 `code` 承载「成功 / 失败」语义，多数业务异常无需关心 HTTP 状态，直接抛即可。

## 全局异常过滤器

过滤器（`apps/server/src/common/filter/all-exception.filter.ts`）在 `app.module.ts` 中以 `APP_FILTER` 全局注册，捕获所有未被业务代码处理的异常：

```typescript
{ provide: APP_FILTER, useClass: AllExceptionsFilter },
```

核心流程：

1. **防重复响应**：检查 `response.writableEnded`，响应已结束则不再处理
2. **解析异常**：`HttpException` 取其状态码与消息，未知异常按 500 兜底
3. **翻译消息**：将各类异常转译为友好提示（见下表），避免原始堆栈泄漏给前端
4. **标准化输出**：统一返回与成功响应同构的结构，前端无需区分处理

```json
{ "code": 500, "message": "该用户已存在", "requestId": "c9dc24ec-...", "data": null, "timestamp": 1757500000000, "duration": 12 }
```

### 异常翻译规则

| 异常类型 | 返回提示 |
| --- | --- |
| DTO 校验失败（`class-validator`） | 取第一条校验消息，如「用户账号须以字母开头、仅含字母与数字」 |
| 限流 `ThrottlerException` | 您的操作过于频繁，请稍后再试 |
| `NotFoundException` | 请求的接口不存在，请检查接口地址或请求方法 |
| 数据库连接异常（`ECONNRESET`） | 数据库连接异常，请联系管理员 |
| 外键约束冲突 | 当前数据关联其它资源，无法执行该操作 |
| 其余未知异常 | 服务器内部错误，请稍后重试 |

### 日志记录

异常发生时按 `请求方法 路径 requestId` 记录错误并附完整堆栈；开发环境将 `query / body` 打印为 JSON 字符串便于排查，生产环境打印结构化对象，日志内容与响应给前端的提示互不影响。

## 前端统一承接

前端响应拦截器（`apps/admin/src/utils/request/`）与后端约定同构，业务代码同样无需重复处理错误：

- `code !== 200` 时 reject 并触发统一错误提示，提示文案**优先展示后端返回的 `message`**（如「该用户已存在」），无则按 HTTP 状态映射兜底文案（如 401「登录已过期」、500「服务器内部错误」）
- `401` 特殊处理：**先尝试无感刷新令牌**——用 `refreshToken` 换取新令牌并自动重放原请求，并发场景下多个 401 共享同一次刷新、只刷一次；刷新不可用（无 refreshToken / 刷新失败 / 重放仍 401）时才清场兜底：提示 → 清除本地令牌对 → 刷新页面
- 提示组件为全局 `TipModal.msgError`，业务代码中的 `catch` 仅用于恢复 loading 等流程控制，不再负责弹错

## 使用总结

| 场景 | 做法 |
| --- | --- |
| 业务校验失败 | `throw new BusinessException('友好提示')` |
| 需要特定错误码 | `throw new BusinessException('提示', 400)` |
| 正常返回数据 | 直接 `return` 数据，全局拦截器自动包装为成功响应 |
| 前端 | 什么都不用做，拦截器自动弹错 |
