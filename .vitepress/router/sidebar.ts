import type { DefaultTheme } from 'vitepress'

// https://vitepress.dev/zh/reference/default-theme-sidebar
// 对象写法是多侧边栏模式 https://vitepress.dev/zh/reference/default-theme-sidebar#multiple-sidebars
// export const sidebar: DefaultTheme.Sidebar = {
//   '/guide/': [
//     {
//       text: '开始',
//       items: [
//         { text: '简介', link: '/guide/introduction' },
//         { text: '快速上手', link: '/guide/quick-start' },
//         { text: '更新日志', link: '/guide/changelog' },
//         { text: '前端手册', link: '/document/frontend.md' },
//       ],
//     },
//   ],
// }
export const sidebar: DefaultTheme.Sidebar = [
  {
    text: '开始',
    items: [
      { text: '简介', link: '/guide/introduction' },
      { text: '快速上手', link: '/guide/quick-start' },
      { text: '前端手册', link: '/document/frontend.md' },
      { text: '后端手册', link: '/document/backend.md' },
      { text: '技能说明', link: '/guide/skills.md' },
      { text: '更新日志', link: '/guide/changelog' },
    ],
  },
  {
    text: '其它',
    items: [
      { text: '常见问题', link: '/other/faq.md' },
      { text: '捐赠支持', link: '/other/donate.md' },
    ],
  },
]
