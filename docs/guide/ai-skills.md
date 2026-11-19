# AI 技能

模板仓库在 `.agents/skills/` 下内置两个 AI 技能：`request-best-practices`（接口请求规范）与 `vue-best-practices`（Vue 3 开发规范）。技能是纯 Markdown 指令集，不绑定特定 AI 工具；使用其它 AI（Cursor、Claude Code、Copilot 等）时，可直接让 AI 把技能转换为对应工具的适配格式：

```text
请阅读 .agents/skills/xxx/SKILL.md 及其同目录的 references/ 参考文档，将这个技能转换为适配 xxx（你的 AI 工具，如 Cursor、Claude Code、Copilot）的规则格式。

转换要求：
1. 保留技能的硬性规则、触发条件与执行流程，不得遗漏或改写；
2. references/ 下的模板与对照表原样复制，只调整引用路径；
3. scripts/ 下的脚本（如有）不转换，保留原始路径引用。
```

## request-best-practices

**作用**：约束 `apps/admin` 接口请求层的写法——请求类、接口模块、类型定义、文件上传下载导出，保证全项目一个口径。

**触发条件**：涉及 `axios`、`@/utils/request`、`src/api` 下的接口模块、接口类型定义、文件上传 / 下载 / 导出的任务。

**硬性规则（第一节，优先级最高）**：

- 接口模块一律 `export class XxxRequest` + `static` 方法，类只作静态方法容器，不实例化；无实体语义的工具类用 `abstract class`（如 `UploadRequest`），阻止 `new`
- 类名与文件名对应（`user.request.ts` → `UserRequest`），按业务域分文件：`src/api/system/`、`src/api/monitor/`，跨域放 `src/api/common/`
- 只写相对路径，不以 `/api` 或域名开头（`baseURL` 已由 `VITE_BASE_API` 配置）
- 接口类型定义在 `src/types/api/**`，通过 `src/types/index.ts` 聚合；`ApiResponse`、`BaseEntity`、`PaginationParams`、`PaginationResult` 是全局类型，不需要 import
- 项目没有 ESLint，类型检查靠 `vue-tsc -b`，且 `noUnusedLocals` / `noUnusedParameters` 已开启

**参考文档**：`references/api-module.md`（接口模块写法）、`references/request-layer.md`（请求层与拦截器）、`references/file-transfer.md`（上传下载导出）。

## vue-best-practices

**作用**：约束 `apps/admin` 的 Vue 3 开发规范，覆盖 SFC 结构、响应式、组件通信、路由、状态管理、全局组件与自动导入。

**触发条件**：涉及 Vue、`.vue` 文件、Vue Router、Pinia、Vite 的任务。

**硬性规则（第一节，优先级最高）**：

- 默认 Composition API + `<script setup lang="ts">`，项目是纯 SPA，不使用 SSR / Nuxt
- SFC 顺序固定为 `<template>` → `<script setup>` → `<style lang="scss" scoped>`，样式用类选择器、kebab-case，层级用 BEM 的 `&__element` 嵌套
- `defineOptions({ name })` 写在 `<script setup>` 首行、import 之前，是否书写取决于组件身份（路由页面与全局组件必须写，页面内局部组件按需）
- 代码风格：无分号、单引号、2 空格缩进、`printWidth: 220`、`trailingComma: "all"`；无 ESLint，类型检查靠 `vue-tsc -b`
- 全局组件在 `src/components/` 下开发、在 `src/plugins/modules/global-component.ts` 集中注册，模板中直接写标签，禁止 `import` 后局部注册
- Vue / Pinia / Vue Router / `@vueuse/core` 的 API、`src/store/modules` 与 `src/hooks` 的导出由自动导入插件提供，禁止重复 import

**参考文档**：`references/` 下 15 篇，涵盖 SFC、响应式、组件插槽与属性透传、异步组件、组合式函数、指令、状态管理、渲染函数、性能等主题；动画、KeepAlive、Suspense、SSR 等项目未使用，相关参考未收录。

## 自定义技能

在 `.agents/skills/` 下新建目录，编写 `SKILL.md`（frontmatter 描述 + 触发条件 + 硬性规则 + 执行流程），可选附 `references/` 参考文档与 `scripts/` 校验脚本。写法参照仓库内现有技能。

::::: tip 与 AI 的其它约定
`AGENTS.md` 里还记录了回复语言、写代码前先描述方案、全局组件与自动导入的使用限制、变量命名要求等协作约定；`.agents/memory/` 存放按日期迭代的项目记忆与总索引 `MEMORY.md`。使用支持读取项目规则的 AI 工具时，让它一并读取这两处即可。
:::::
