import type { DefaultTheme } from 'vitepress'

// https://vitepress.dev/zh/reference/default-theme-sidebar
// 对象写法是多侧边栏模式 https://vitepress.dev/zh/reference/default-theme-sidebar#multiple-sidebars
export const sidebar: DefaultTheme.Sidebar = {
  '/guide/': [
    {
      text: '开始',
      items: [
        { text: '简介', link: '/guide/introduction' },
        { text: '快速上手', link: '/guide/quick-start' },
        { text: '更新日志', link: '/guide/changelog' },
        { text: '前端手册', link: '/guide/frontend.md' },
        { text: '后端手册', link: '/guide/backend.md' },
      ],
    },
    {
      text: '其它',
      items: [
        { text: '常见问题', link: '/other/faq.md' },
        { text: '捐赠支持', link: '/other/donate.md' },
      ],
    },
  ],
  '/codecopy/': [
    {
      text: '代码小抄',
      items: [
        { text: '复制文本到剪贴板', link: '/codecopy/typescript/copy-text' },
        { text: 'ElMessage 二次封装', link: '/codecopy/typescript/tip-modal' },
        { text: 'LocalStorage 二次封装', link: '/codecopy/typescript/cache-util' },
      ],
    },
    {
      text: '前端工程化',
      items: [
        { text: 'npmrc 配置参考', link: '/codecopy/engineering/npmrc' },
        { text: 'Prettier 格式化配置', link: '/codecopy/engineering/prettierrc' },
        { text: 'SVG 一键清理脚本', link: '/codecopy/engineering/svg-clean' },
      ],
    },
  ],
}
// export const sidebar: DefaultTheme.Sidebar = [
//   {
//     text: '开始',
//     items: [
//       { text: '简介', link: '/guide/introduction' },
//       { text: '快速上手', link: '/guide/quick-start' },
//       { text: '前端手册', link: '/document/frontend.md' },
//       { text: '后端手册', link: '/document/backend.md' },
//       { text: '前端面试题', link: '/interview/frontend.md' },
//       { text: '技能说明', link: '/guide/skills.md' },
//       { text: '更新日志', link: '/guide/changelog' },
//     ],
//   },
//   {
//     text: '其它',
//     items: [
//       { text: '常见问题', link: '/other/faq.md' },
//       { text: '捐赠支持', link: '/other/donate.md' },
//     ],
//   },
// ]
