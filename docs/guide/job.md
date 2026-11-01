# 定时任务

定时任务用于定时报表生成、数据清理、状态轮询、补偿比对等周期性工作。模板基于 BullMQ + Redis 实现界面化动态管理：启动、暂停、执行一次、删除、修改全部在系统监控下完成，任务代码只需写一个普通 Service 方法，通过调用目标字符串被调度系统发现并执行。参考实现：`modules/monitor/job`。

## 编写任务代码

任务即 Service 方法。框架启动时通过 `DiscoveryService` 自动扫描所有以 `Service` 结尾的类，注册进服务发现注册表，无需手工登记：

```typescript
@Injectable()
export class CleanTaskService {
  /** 需要 this 上下文的方法，用箭头函数属性定义 */
  cleanLog = (days: number) => {
    /* 清理 days 天前的日志 */
  }

  /** 不依赖 this 的方法，普通方法即可 */
  notify(msg: string) {
    /* 发送通知 */
  }
}
```

业务方法编写约定：

- 方法需要 `this` 上下文时，用箭头函数属性定义，否则运行时 `this` 为空
- 参数与返回值无特殊限制，参数由调用目标字符串按 JSON 字面量传入
- 调用目标格式为 `类名.方法名(参数)`，如 `CleanTaskService.cleanLog(30)`、`CleanTaskService.notify('hello')`
- 参数写法对齐 JSON：字符串用单引号 `'30天'`，数字直接写，布尔用 `true` / `false`，数组与对象写合法 JSON；解析不使用 `eval`，非法格式在保存时即被驳回

## 新建定时任务

在系统监控的定时任务页新建，任务字段：

| 字段 | 说明 |
| --- | --- |
| 任务名称 | 全局唯一，重复名称保存时被驳回 |
| 任务组名 | 业务分组，默认 `DEFAULT` |
| 调用目标 | `Service.method(参数)` 格式 |
| cron 表达式 | 调度周期，保存时由 `cron-parser` 严格校验 |
| 错失策略 | 服务重启后对失败队列中任务的补偿方式，见下文 |
| 是否并发 | 上一次执行未结束时是否允许下一次触发 |
| 状态 | 正常或暂停 |

保存时后端完成三重校验：任务名称去重、cron 表达式合法、调用目标可解析——解析出服务与方法后逐一确认存在，任何一步失败都不入库。配置完成后点击「执行一次」验证任务能否正常执行与记日志。

## 执行机制

- **动态调度**：任务以自身 ID 为键注册 BullMQ Job Scheduler，cron 表达式即调度 pattern；启动前先移除旧调度器，杜绝重复触发
- **反射调用**：执行器按调用目标解析出服务与方法，`ModuleRef` 跨模块取实例后调用，任务代码与调度系统完全解耦
- **并发控制**：允许并发时触发即执行、不等待上次完成，失败主动标记；禁止并发时等待上次执行完成，避免任务堆叠
- **调度日志**：成功与失败由 Worker 事件统一记录，一次执行只产生一条日志，含任务名、分组、调用目标、状态与失败原因
- **编辑与删除**：编辑先停旧调度器再按状态重启；删除同时移除调度器并清理等待中的「执行一次」任务，不会残留幽灵调度

## 错失补偿

服务重启期间错过的触发不静默丢失。启动时清理 Redis 残留调度器与队列任务后，对失败队列中的任务按 `misfirePolicy` 补偿：

| 值 | 策略 | 行为 |
| --- | --- | --- |
| `1` | 立即执行 | 所有错失的任务立即补执行 |
| `2` | 执行一次 | 错失多次也只补执行一次，按下次周期正常运行 |
| `3` | 放弃执行 | 不补执行，仅清理失败记录 |

补偿完成后按状态重启全部正常任务。默认策略为「放弃执行」，对补偿敏感的业务在新建任务时显式选择。

## cron 表达式

标准五段式 `分 时 日 月 周`（校验与调度同用 `cron-parser`，也兼容含秒的六段式等扩展语法），常用写法：

| 表达式 | 说明 |
| --- | --- |
| `0 * * * *` | 每小时整点 |
| `*/5 * * * *` | 每 5 分钟 |
| `0 2 1 * *` | 每月 1 日凌晨 2 点 |
| `0 10,14,16 * * *` | 每天 10 点、14 点、16 点 |
| `*/30 9-17 * * 1-5` | 工作日朝九晚五每半小时 |
| `0 12 * * 3` | 每周三中午 12 点 |

`*` 所有值、`,` 多个值、`-` 区间、`/` 递增步进；`?` 用于日与周互斥时占位，`L`、`W`、`#` 支持月末、最近工作日、第几个周几等进阶语义。

## 端点与权限

| 操作 | 方法 | 路径 | 权限码 |
| --- | --- | --- | --- |
| 新增 | POST | `/monitor/job/create` | `monitor:job:create` |
| 编辑 | PUT | `/monitor/job/update` | `monitor:job:update` |
| 任务列表 | GET | `/monitor/job/list` | `monitor:job:query` |
| 任务详情 | GET | `/monitor/job/detail` | `monitor:job:query` |
| 修改状态 | PUT | `/monitor/job/changeStatus` | `monitor:job:update` |
| 执行一次 | PUT | `/monitor/job/run` | `monitor:job:update` |
| 删除 | DELETE | `/monitor/job/delete` | `monitor:job:delete` |
| 调度日志列表 | GET | `/monitor/job/log/list` | `monitor:job:query` |
| 日志删除 | DELETE | `/monitor/job/log/delete` | `monitor:job:delete` |
| 日志清空 | DELETE | `/monitor/job/log/clear` | `monitor:job:clear` |
| 日志导出 | POST | `/monitor/job/log/export` | `monitor:job:export` |

调度日志的删除、清空、导出均基于通用能力实现，导出走 Excel 文件流，见 [导入导出](./excel)。
