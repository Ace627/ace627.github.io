import type { DefaultTheme } from 'vitepress'

export const navbar: DefaultTheme.NavItem[] = [
  { text: '🏠 首页', link: '/' },
  {
    text: '🤖 AI',
    items: [
      { text: '硅基流动', link: 'https://www.siliconflow.cn' },
      { text: '阿里云百炼', link: 'https://www.aliyun.com/benefit/scene/codingplan' },
      { text: 'Agent Skills 市场', link: 'https://skillsmp.com/zh' },
      { text: 'Element-Plus-X', link: 'https://element-plus-x.com/zh' },
    ],
  },
  {
    text: '🔗 链接',
    items: [
      { text: '预览地址', link: 'https://cnbox.online' },
      { text: 'Gitee 源码', link: 'https://gitee.com/decade9527/YunHe-Vue' },
      { text: 'Github 源码', link: 'https://github.com/Ace627/YunHe-Vue' },
      { text: '文档源码', link: 'https://github.com/Ace627/ace627.github.io' },
    ],
  },
]
