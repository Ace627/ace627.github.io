import type { DefaultTheme } from 'vitepress'

export const navbar: DefaultTheme.NavItem[] = [
  { text: '🏠 首页', link: '/' },
  { text: '📖 文档', link: '/guide/introduction' },
  { text: '💬 反馈', link: 'https://github.com/Ace627/nestjs-admin-template/issues' },
  {
    text: '🔗 链接',
    items: [
      { text: '接口文档', link: 'https://docs.apipost.net/docs/detail/61e0debdacca000?target_id=0' },
      { text: 'Gitee 源码', link: 'https://gitee.com/decade9527/nestjs-admin-template' },
      { text: 'Github 源码', link: 'https://github.com/Ace627/nestjs-admin-template' },
    ],
  },
]
