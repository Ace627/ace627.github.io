# 参数验证

参数验证依赖 NestJS 全局 `ValidationPipe` 与 `class-validator` 装饰器：规则声明在 DTO 类上，请求进来时自动校验，非法参数在进入 Controller 之前就被拦截，业务代码无需重复判空。

## 全局管道配置

`app.module.ts` 中以 `APP_PIPE` 注册全局验证管道：

```typescript
import { ValidationPipe } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'

// 配置全局验证管道，用于验证请求参数和响应数据
{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true, stopAtFirstError: true }) },
```

三个选项各自的作用：

| 选项 | 作用 |
| --- | --- |
| `whitelist: true` | 自动剥离 DTO 中未声明的多余字段，防止恶意注入不存在的属性 |
| `transform: true` | 自动类型转换，配合 `@Type(() => Number)` 把 query 中的字符串参数转为数字 |
| `stopAtFirstError: true` | 每个字段遇到第一个错误即停止，校验消息一次只返回一条，前端提示更清爽 |

## 在 DTO 上声明规则

校验规则用 `class-validator` 装饰器写在 DTO 字段上，可选字段标 `@IsOptional`：

```typescript
import { IsArray, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

export class CreateUserDto {
  /** $property 会被自动替换为字段名 */
  @IsNotEmpty({ message: '参数 $property 不能为空' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, { message: '用户账号须以字母开头、仅含字母与数字' })
  username: string

  @IsArray()
  @IsNotEmpty({ message: '参数 $property 不可为空' })
  roleIds: string[]

  @IsNotEmpty({ message: '参数 $property 不能为空' })
  @IsString()
  deptId: string

  @IsOptional()
  nickname: string
}
```

常用装饰器一览：

| 装饰器 | 用途 | 项目示例 |
| --- | --- | --- |
| `@IsNotEmpty` | 非空校验 | 必填字段的通用兜底 |
| `@IsOptional` | 可选字段，值为 `undefined` 时跳过后续校验 | 查询与编辑 DTO 的非必填项 |
| `@IsString` / `@IsNumber` / `@IsArray` | 类型校验 | `deptId: string`、`roleIds: string[]` |
| `@Matches` | 正则校验 | 用户账号「字母开头、仅含字母与数字」 |
| `@Type(() => Number)` | 类型转换（配合 `transform: true`） | 分页参数 `pageNo / pageSize` |
| `PartialType` / `PickType` | DTO 组合复用 | `UpdateUserDto` 继承新增的全部规则 |

查询 DTO 继承 `PaginationDto`，分页参数同样走这套校验（`pageNo / pageSize` 必须是数字，配合 `@Type` 自动转换）：

```typescript
@IsOptional()
@Type(() => Number)
@IsNumber({}, { message: '页码必须是数字类型' })
public pageNo: number
```

## 校验失败的表现

校验失败抛出 `BadRequestException`，由全局异常过滤器捕获，配合 `stopAtFirstError` 每次返回一条最优先的提示：

```json
{ "code": 400, "message": "参数 username 不能为空", "requestId": "c9dc24ec-...", "data": null, "timestamp": "...", "duration": 12 }
```

前端拦截器收到后自动弹出该提示，页面无感知、业务代码零处理。

## 自定义校验

内置装饰器覆盖不到的场景，按需求复杂度分三档处理：

**1. 格式校验 → `@Matches` 自定义正则**。任何正则能表达的规则都可以直接写：

```typescript
// 用户账号：字母开头、仅含字母与数字
@Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, { message: '用户账号须以字母开头、仅含字母与数字' })
username: string

// 手机号
@Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号码' })
phone: string
```

**2. 字段间联动的条件校验 → `@ValidateIf`**。某字段仅在其它字段取特定值时才需要校验（项目中的真实案例，角色数据权限 DTO）：

```typescript
/** 自定义数据范围的部门 ID 组（仅 dataScope = '2' 时生效并校验，其余档位忽略） */
@ValidateIf((dto) => dto.dataScope === DataScopeType.CUSTOM)
@IsArray({ message: '部门 ID 组必须是数组' })
@ArrayNotEmpty({ message: '自定义数据范围至少选择一个部门' })
deptIds: string[]
```

**3. 跨字段或复杂逻辑 → `registerDecorator` 自定义校验装饰器**（`class-validator` 原生能力，适合多处复用的校验，如「结束时间晚于开始时间」。下方 `LaterThan` 为示例代码，模板未内置该装饰器）：

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'

/** 用法：@LaterThan('startTime', { message: '结束时间必须晚于开始时间' }) */
export function LaterThan(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'laterThan',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName]
          // 校验逻辑：返回 false 时抛出 message
          return new Date(value as string) > new Date(relatedValue as string)
        },
      },
    })
  }
}
```

选择建议：能写正则就用 `@Matches`；只在特定条件下生效用 `@ValidateIf`；需要比较多个字段或跨请求校验（如查库判重，但项目约定判重放 Service）时再写自定义装饰器。

## 前后端配合

前端编辑弹窗内的 `el-form` rules（如手机号正则、密码长度）负责**即时提示**，用户提交前就能看到问题；后端 DTO 校验是**最终防线**，防止绕过页面直接调接口提交非法数据。两层校验规则保持一致（如账号正则、手机号格式），以同样的文案提示。
