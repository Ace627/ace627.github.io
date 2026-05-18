# 校验方法合集

## isString

```typescript
/**
 * 判断值是否为字符串
 * @param value - 待判断的值
 * @returns boolean
 */
export function isString(value: unknown): boolean {
  return typeof value === 'string' || Object.prototype.toString.call(value) === '[object String]'
}
```

## isNumber

如需排除 `NaN` 可改用 `typeof value === 'number' && !Number.isNaN(value)`

```typescript
/**
 * 判断值是否为数字（包含 NaN）
 * @param value - 待判断的值
 * @returns boolean
 */
export function isNumber(value: unknown): boolean {
  return typeof value === 'number' || Object.prototype.toString.call(value) === '[object Number]'
}
```

## isBoolean

```typescript
/**
 * 判断值是否为布尔值
 * @param value - 待判断的值
 * @returns boolean
 */
export function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean' || Object.prototype.toString.call(value) === '[object Boolean]'
}
```

## isArray

```typescript
export function isArray(value: unknown): boolean {
  return Array.isArray(value)
}
```

## isPlainObject

```typescript
/**
 * 判断值是否为纯对象（由 {} 或 new Object() 创建）
 * @param value - 待判断的值
 * @returns boolean
 */
export function isPlainObject(value: unknown): boolean {
  // 基础类型和 null 直接返回 false
  if (!value || typeof value !== 'object') return false
  // 必须通过 toString 判定为普通对象
  if (Object.prototype.toString.call(value) !== '[object Object]') return false
  // 原型为 null 的对象（如 Object.create(null)）视为纯对象
  const proto = Object.getPrototypeOf(value)
  if (proto === null) return true
  // 确保对象的原型链顶层是 Object.prototype
  let constructor = proto.constructor
  if (typeof constructor !== 'function') return false
  let protoOfProto = Object.getPrototypeOf(proto)
  // 如果原型链顶层是 null，则表示继承自 Object.prototype
  return protoOfProto === null
}
```

## isExternal

```typescript
/**
 * 判断链接是否为外部链接
 * @param value - 待判断的链接/路径
 * @returns boolean
 */
export function isExternal(value: any): boolean {
  if (typeof value !== 'string') return false
  const trimmedValue = value.trim()
  if (trimmedValue === '') return false
  return /^(https?:|ftp:|sftp:|mailto:|tel:|file:|\/\/)/i.test(trimmedValue)
}
```

## isStringNumber

```typescript
/**
 * 判断字符串是否为有效的数字格式
 * 支持整数、小数、负数和科学计数法
 * @param value - 待判断的值
 * @returns boolean
 */
export function isStringNumber(value: any): boolean {
  if (typeof value !== 'string') return false
  const trimmedValue = value.trim()
  if (trimmedValue === '') return false
  return /^-?\d+(\.\d+)?$/.test(trimmedValue) // 匹配整数或浮点数
}
```

## isJsonString

```typescript
/**
 * 判断字符串是否为有效的 JSON 格式
 * @param value - 待判断的值
 * @returns boolean
 */
export function isJsonString(value: any): boolean {
  try {
    if (typeof value !== 'string') return false
    const trimmedValue = value.trim()
    if (trimmedValue === '') return false
    if (trimmedValue[0] !== '{' && trimmedValue[0] !== '[') return false
    JSON.parse(trimmedValue)
    return true
  } catch {
    return false
  }
}
```
