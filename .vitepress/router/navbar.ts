import type { DefaultTheme } from 'vitepress'

export const navbar: DefaultTheme.NavItem[] = [
  // { text: '使用手册', link: '/cookbook/index.md' },
  {
    text: '托管平台',
    items: [
      { text: 'Gitee', link: 'https://gitee.com/decade9527/YunHe-Vue' },
      { text: 'Github', link: 'https://github.com/Ace627/YunHe-Vue' },
    ],
  },
]
