import type { DefaultTheme } from 'vitepress'

export const navbar: DefaultTheme.NavItem[] = [
  { text: '首页', link: '/' },

  {
    text: 'AI',
    items: [
      { text: '硅基流动', link: 'https://www.siliconflow.cn' },
      { text: '阿里云百炼', link: 'https://www.aliyun.com/benefit/scene/codingplan' },
      { text: 'Agent Skills 市场', link: 'https://skillsmp.com/zh' },
      { text: 'Element-Plus-X', link: 'https://element-plus-x.com/zh' },
    ],
  },
  // { text: '来财', link: '/other/fund.md' },
  // { text: '个人简历', link: '/other/resume.md' },
  {
    text: '托管平台',
    items: [
      { text: 'Gitee', link: 'https://gitee.com/decade9527/YunHe-Vue' },
      { text: 'Github', link: 'https://github.com/Ace627/YunHe-Vue' },
    ],
  },
]
