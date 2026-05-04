import type { DefaultTheme } from 'vitepress'

// https://vitepress.dev/zh/reference/default-theme-sidebar
export const sidebar: DefaultTheme.Sidebar = [
  {
    text: '开始',
    items: [
      { text: '简介', link: '/guide/introduction' },
      { text: '快速上手', link: '/guide/quick-start' },
      { text: '更新日志', link: '/guide/changelog' },
    ],
  },
]
