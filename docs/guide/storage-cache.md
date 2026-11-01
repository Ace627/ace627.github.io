# 本地缓存

`StorageCache` 是基于 `localStorage` 的封装类，定义在 `src/utils/cache/storage-cache.ts` 文件中（经 `@/utils` 统一导出），提供带过期时间、带键前缀的键值存取能力，有如下方法：

| 方法              | 说明                                             |
| ----------------- | ------------------------------------------------ |
| `set(key, value, ttl?)` | 写入存储，`ttl` 单位秒，默认 `-1` 表示永不过期 |
| `get(key)`        | 读取存储，不存在或已过期时返回 `undefined`       |
| `getWithDefault(key, defaultValue)` | 读取存储，不存在或已过期时返回默认值 |
| `remove(key)`     | 删除指定键                                       |
| `clear()`         | 清空本工具写入的所有存储，不影响其它 localStorage 数据 |

## 基础用法

支持任意可 JSON 序列化的值（对象、数组、字符串、数字等），无需手动处理序列化：

```ts
import { StorageCache } from '@/utils/storage-cache'

// 存对象，永不过期
StorageCache.set('userInfo', { name: 'admin', roles: ['admin'] })

// 存字符串，30 秒后过期
StorageCache.set('searchHistory', '关键字', 30)

// 读取（带类型推断与默认值）
const user = StorageCache.get('userInfo')
const tip = StorageCache.getWithDefault('notExistKey', '默认值')

// 删除与清空
StorageCache.remove('userInfo')
StorageCache.clear()
```

:::: tip 过期机制
写入时会把值包装为 `{ value, ttl }` 结构（`ttl` 记录过期时间点）；读取时惰性判断，已过期的键会被立即删除并返回默认值，无需后台定时清理。
::::

## 键前缀隔离

所有键会自动拼接 `apps/admin/.env` 中配置的统一前缀 `VITE_STORAGE_PREFIX`（默认 `app:storage:`）：

```dotenv
# apps/admin/.env
# 本地缓存统一键前缀
VITE_STORAGE_PREFIX="app:storage:"
```

- 实际写入 localStorage 的键形如 `app:storage:accessToken`
- `clear()` 只删除带该前缀的键，**不会误删**同源下其它应用或组件写入的 localStorage 数据
- 同一域名下部署多个项目时，可通过修改前缀实现缓存隔离

## 按模块封装

项目约定不在业务代码中直接散落调用 `StorageCache`，而是在 `src/utils/cache/` 目录按领域封装语义化方法，与后端 Service 层风格一致。目前已有：

| 文件                     | 职责                                       |
| ------------------------ | ------------------------------------------ |
| `token.cache.ts`         | accessToken / refreshToken 持久化          |
| `login-params.cache.ts`  | 「记住密码」的登录参数                     |
| `system-setting.cache.ts`| 布局与主题设置                             |
| `sidebar-status.cache.ts`| 侧边栏展开状态                             |
| `tags-view.cache.ts`     | 多标签页持久化                             |
| `column-hidden.cache.ts` | 列表列显隐记忆（配合 `RightToolbar` 的 `storageKey`） |

以 `token.cache.ts` 为例：

```ts
import { StorageCache } from '../storage-cache'

/** 写入 accessToken（短时凭证，每次请求通过 Authorization 头携带） */
export function setAccessToken(token: string): boolean {
  return StorageCache.set('accessToken', token)
}

/** 读取 accessToken；未存储时返回 null */
export function getAccessToken(): string | null {
  return StorageCache.get<string>('accessToken')
}

/** 清除 accessToken（登出或收到 401 时调用） */
export function removeAccessToken(): void {
  return StorageCache.remove('accessToken')
}
```

业务侧从 `@/utils` 统一引入使用即可：

```ts
import { getAccessToken, setAccessToken } from '@/utils'

setAccessToken(token)
```

:::: warning Token 的过期约定
Token 的过期与有效性由服务端 Redis 负责，前端仅做「不透明持久化」，不设置客户端 TTL；登出或收到 401 时由调用方调用 `removeAccessToken` / `removeRefreshToken` 清场。
::::
