---
name: article_writing_vitepress
description: 面向 VitePress 文档站点的专业文章创作技能，适配技术教程、实战复盘、源码解析、工具实践、行业观点等技术内容类型，严格遵循 VitePress 写作规范与用户阅读偏好，输出结构规整、排版美观、内容实用、通俗易懂的高质量技术文档。
---

### 指令

````yaml
# codemap
## 命令
1. 执行 VitePress 文档创作核心流程：需求解析 → 结构规划 → 内容撰写 → 排版优化 → 合规校验
2. 优先适配 VitePress Markdown 语法规范，支持代码块高亮、图片自适应排版

## 使用场景
1. 前端 / 后端 / AI 技术教程类文章创作
2. 技术实战复盘、项目经验总结类内容输出
3. 源码解析、工具使用教程类文档编写
4. 行业技术趋势、开发技巧类观点类文章生成
5. 适配 VitePress 响应式布局的轻量化内容创作

## 输出解释
1. 文章结构：严格遵循 VitePress 文档标准格式（清晰标题 + 分模块正文 + 核心总结）
2. 内容风格：语言简洁直白、逻辑连贯，兼顾新手易懂性与进阶专业性，减少冗余术语
3. 排版规范：使用 VitePress 合规 Markdown 语法，代码块标注对应技术栈语言、标题层级清晰
4. 标题编号：二级标题用中文数字（一、二、三、…）后跟标题内容；三级标题用阿拉伯数字（2.1、2.2 等，由上级编号衍生）
5. 内容价值：包含实操步骤、踩坑经验、核心知识点总结，贴合技术文档读者阅读与参考需求
6. 代码格式：
   - 能单行的就单行，保持代码简洁紧凑
   - 代码末尾不要添加分号，遵循现代 JavaScript / TypeScript 编码规范
   - 避免不必要的代码换行，如：
     - 错误：`throw new HttpException("OpenAI API Key 未配置", HttpStatus.INTERNAL_SERVER_ERROR)` 应写在一行
     - 错误：`response.write(\`data: ${JSON.stringify({ error: error.message || "未知错误" })} \n\n\`)` 应写在一行
     - 错误：`textarea.style.cssText = \` position: fixed; opacity: 0; z-index: -9999; left: -9999px; top: -9999px; \` ` 应写在一行
   - throw 语句不需要 return，直接抛出即可：
     - 正确：`if (!copied) throw new Error('浏览器限制或无法复制')`
     - 错误：`if (!copied) { return throw new Error('浏览器限制或无法复制') }`（语法错误，throw 前不能加 return）
7. 配置项格式：所有配置项必须先声明后填充，参考以下格式：
8. 边界条件：
   - 用户需求模糊时，先列出 2-3 个可能的文章方向供用户选择确认，不直接猜测
   - 仅有标题或一句话需求时，先追问技术栈、目标读者、文章深度再开始创作
   - 用户提供素材不足时，明确告知缺少哪些关键信息并用占位符标注（如 `...（此处需补充具体实现代码）`）
   - 遇到不可执行代码或废弃 API 时，优先使用当前主流版本替代并标注差异
   - 文章类型难以归类时，fallback 到通用教程格式（问题背景 → 解决方案 → 效果验证）
   ```typescript
   const options: ChatOpenAIFields = {}
   options.apiKey = this.configService.get('openai.apiKey')
   options.model = this.configService.get('openai.model')
   options.temperature = 0.5
   options.streaming = true // 开启流式输出
   options.configuration = {}
   options.configuration.baseURL = this.configService.get('openai.baseURL')
   return new ChatOpenAI(options)
   ```
## 示例
### 示例 1：技术教程类文章（前端 Vue3 实战）
# 基于 Vue3 + Setup 语法实现流式数据渲染（markstream-vue）实战
> 本文手把手教你在 Vue3 项目中快速集成 markstream-vue，实现大文本 / 大列表流式渲染，解决页面卡顿问题

## 一、环境准备与依赖安装

### 1.1 Node.js 版本要求
项目运行要求 Node.js 16+ 版本，推荐使用 nvm 或 fnm 管理本地 Node.js 环境。

首先确保你的 Vue3 项目已初始化，执行以下命令安装核心依赖：

### 1.2 依赖安装步骤
```bash
# npm 安装
npm install markstream-vue
# yarn 安装
yarn add markstream-vue
````

## 二、核心配置与组件封装

### 2.1 基础配置项说明

markstream-vue 提供 chunkSize（每批渲染条数）、lazyLoad（懒加载开关）等核心配置项，下文逐一说明：

在 Vue3 单文件组件中引入 markstream-vue 并完成基础配置：

### 2.2 组件封装实战

```vue
<template>
  <div class="stream-render-container">
    <MarkstreamVue :data="streamData" :options="renderOptions" />
  </div>
</template>

<script setup lang="ts">
import MarkstreamVue from 'markstream-vue'
import { ref } from 'vue'

// 流式数据模拟
const streamData = ref(['部分流式数据 1', '部分流式数据 2', '...'])
// 渲染配置
const renderOptions = ref({
  chunkSize: 10,
  lazyLoad: true,
})
</script>
```

## 三、流式渲染逻辑实现

### 3.1 数据流初始化

...（核心逻辑内容）

### 3.2 渲染生命周期控制

## 四、性能优化与边界处理

...（优化技巧内容）

## 五、实战效果与拓展应用

本文实现的流式渲染可直接应用于大日志展示、聊天记录加载等场景，你还可以...

### 核心总结

本文通过 Vue3 + markstream-vue 快速实现了流式数据渲染，解决了大数据量渲染导致的页面卡顿问题，核心配置与逻辑仅需几十行代码即可落地。

### 示例 2：工具实践类文章（NestJS 文件上传）

# NestJS 实现大文件分片上传 + 断点续传（含前端 Vue3 对接）

> 详解 NestJS 后端如何处理大文件分片上传，结合前端 Vue3 实现断点续传、秒传功能，附完整可运行代码

## 一、后端分片接收核心实现

### 1.1 分片接口设计

...（NestJS 代码实现）

### 1.2 断点续传标记维护

## 二、前端分片切割与断点续传逻辑

### 2.1 文件切片策略

...（Vue3 代码实现）

### 2.2 断点状态保存与恢复

## 三、文件合并与校验机制

...（核心逻辑）

## 四、异常处理与性能优化

...（拓展内容）

### 核心总结

NestJS + Vue3 大文件分片上传方案核心在于「前端分片切割 + 后端分片接收 + 断点续传标记」，完整代码可直接复制到项目中使用。
