# 常见问题

## 为什么选用 monorepo 架构

采用 Monorepo 架构（基于 pnpm Workspace），核心优势在于它能够完美适配 Trae 这类 AI 辅助开发工具的工作模式：首先，将 admin（Vue3 前端）和 server（NestJS 后端）集中在同一仓库，AI 工具可以获取完整的项目上下文，包括统一的目录结构、共享的类型定义和一致的代码规范，从而生成更精准、更符合项目风格的代码；其次，Monorepo 便于 AI 进行跨模块分析，无论是前后端联调还是代码重构，AI 都能理解模块间的依赖关系和调用链，提供更有价值的开发建议；最后，统一的依赖管理和脚本命令让 AI 能够更好地理解项目的构建和运行流程，在自动化生成代码时确保依赖版本一致、脚本调用正确，大幅提升 AI 辅助开发的效率和质量。

## 如何提取本项目为项目经历

在提示词管理系统中，【提取本项目为项目经历】这条系统预设提示词内置了一套专业简历生成逻辑，选中后 AI 将以资深全栈开发工程师简历顾问的角色，自动扫描 SUMMARY.md、pnpm-workspace.yaml、各包 package.json、nest-cli.json、vite.config.ts、docker-compose.yml 等核心配置文件，精准提取项目名称、技术栈、项目时间与角色定位，按大厂标准生成一份可直接复制到简历的项目经历，内容涵盖 1 至 2 句项目描述、4 至 6 条以动词开头的主要职责（均衡覆盖后端、前端与工程化工作）、3 至 5 条带量化指标的技术亮点与项目成果，重点突出 Monorepo 架构的工程价值、前后端类型安全协同、NestJS 装饰器驱动设计及 Vue3 组件化优化能力，全程只需一条命令即可将整个项目提炼为简历中的核心竞争力。

## 如何新增系统图标

- 从 [iconfont](https://www.iconfont.cn/) 选择并下载 SVG 图标
- 重命名为大驼峰格式（如 `User.svg`），放入 `src/assets/icons`
- 在项目根目录执行 `pnpm svg:clean` 清理冗余属性并压缩
- 刷新浏览器（若图标空白，刷新即可，无需重启项目）
- 使用 `<SvgIcon name="User" />` 组件显示图标

## 如何新增全局组件

- 创建组件文件 `src/components/MyComponent/index.vue`
- 如需类型定义，创建 `src/components/MyComponent/types.ts`
- 有类型时，在 `src/types/index.ts` 中统一导出类型
- 在 `src/plugins/modules/global-component.ts` 中注册全局组件
- 在 `types/global-component.d.ts` 中注册全局组件类型（提供 TS 提示）
- 之后即可在任意页面直接使用 `<MyComponent />`

## 如何使用组件缓存

在 Vue 动态路由场景下，动态加载的组件没有静态 name，导致 KeepAlive 无法正确匹配组件实例，缓存机制随之失效。传统做法是在每个动态页面中手动编写 `defineOptions({ name: 'xxx' })`，但动态路由页面数量多，一旦遗漏某个页面就会导致该页面缓存失效，维护成本极高。针对这一痛点，我们采用在组件加载阶段自动注入 name 的方案：通过 `upperFirst` 和 `camelCase` 自动将路由路径转换为 PascalCase 组件名，并在异步加载完成后注入到 `comp.default.name` 上，使 KeepAlive 能准确识别并缓存每个动态页面。由此所有动态页面无需手动编写 `defineOptions`，只有少数静态路由（如 404）才需手动设置 name，大幅降低维护成本。

## 宝塔的 Docker 容器编排怎么写

- `docker-compose.yaml` 去掉 `build` 配置项即可
- 然后按照 `.env.example` 配置环境变量 `env` 文件
- 最后启动容器即可
