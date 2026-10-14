# AI 技能

模板仓库在 `.codebuddy/skills/` 下内置三个 AI 技能（`code-generator` / `batch-sort` / `apipost-doc-sync`，详见下文）。技能是纯 Markdown 指令集，不绑定特定 AI 工具；使用其它 AI（Cursor、Claude Code 等）时，可直接让 AI 把技能转换为对应工具的适配格式：

```text
请阅读 .codebuddy/skills/xxx/SKILL.md 及其同目录的 references/ 参考文档，将这个技能转换为适配 xxx（你的 AI 工具，如 Cursor、Claude Code、Copilot）的规则格式。

转换要求：
1. 保留技能的描述、触发条件、工作流程与硬性规范，不得遗漏或改写；
2. references/ 下的模板与对照表原样复制，只调整引用路径；
3. scripts/ 下的脚本不转换，保留原始路径引用。
```

## code-generator

**作用**：标准业务模块全栈脚手架，支持纯分页、树形、主子表三种形态，分别参照 `config`、`dept` 等既有模块的实现规范。

**触发条件**：新增业务模块、实现标准增删改查、搭建模块脚手架。

**注意事项**：

- 仅适用于标准 CRUD 模块；`file`、`job`、`loginlock`、`upload` 等含特殊语义的模块不适用，需手工实现
- 字段配置表（类型、查询方式、控件、字典绑定、是否必填等）未经逐字段确认前，技能禁止写代码——务必认真核对
- 写操作端点自动挂 `@RequirePermissions` 权限码与 `@Operlog` 操作日志；init.sql 只追加菜单与按钮权限行，表结构靠 `MYSQL_SYNCHRONIZE=true` 自动同步
- 生成后运行对账脚本自检（新文件需先 `git add`）：

```bash
node .codebuddy/skills/code-generator/scripts/checklist.mjs
```

## batch-sort

**作用**：为任何带排序字段的模块添加「行内排序 + 批量保存」，与菜单管理的排序交互一致。

**触发条件**：要求为模块添加排序功能、批量排序、保存排序、添加 `update/sort` 接口。

**注意事项**：

- 排序字段名以实际实体为准（如 `deptSort` / `roleSort`），技能会先探查再动手，不要在需求里凭记忆写错字段名
- 定稿规范不可偏离：请求体为裸数组 `[{ id, xxxSort }]`；空数组时后端抛 `BusinessException('未检测到排序修改')`、前端同步拦截；权限复用模块既有 update 码，不新增 sys_menu 记录
- 排序输入框宽 72px、`size="small"`；「保存排序」按钮放「新增」之后、warning 色、无变更时禁用
- 已知坑：改 ProTable columns 严防双逗号（运行时崩溃且 vue-tsc 不报错）；slot 列不写 `prop`；树表排序列宽 90 → 130

## apipost-doc-sync

**作用**：把 `server/src/modules/**` 全部控制器端点生成 Apipost 兼容文档 JSON（OpenAPI 3.0 + `x-*` 扩展），支持无基线全量生成或基于 Apipost 导出 JSON 的幂等合并。

**触发条件**：生成/更新接口文档、同步新增端点进文档、核对文档与代码差异。

**注意事项**：

- 端点定义只改 `scripts/sync-openapi.mjs` 的 `DEFS` 区，helper 区勿动，禁止手写整份 JSON
- 接口名必须纯汉字且不超过 8 字，违例脚本直接退出
- 文档示例数据从实体、service 返回文案、常量中提取，禁止编造
- 输出固定为项目根目录 `接口文档_时间戳.json`，基线文件不会被改动；合并模式已存在的 path+method 自动跳过，`--force` 才覆盖
- 生成后在 Apipost 重新导入并抽查 2~3 个新增条目

```bash
# 无基线：全量生成
node .codebuddy/skills/apipost-doc-sync/scripts/sync-openapi.mjs

# 有基线：幂等合并
node .codebuddy/skills/apipost-doc-sync/scripts/sync-openapi.mjs <基线json>
```

## 自定义技能

在 `.codebuddy/skills/` 下新建目录，编写 `SKILL.md`（描述 + 触发条件 + 工作流程 + 硬性规范），可选附 `references/` 参考文档与 `scripts/` 校验脚本。写法参照仓库内现有技能。
