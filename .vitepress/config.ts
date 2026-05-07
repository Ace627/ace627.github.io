import { defineConfig } from 'vitepress'
import { navbar, sidebar } from './router'

export default defineConfig({
  // 站点级选项
  lang: 'zh-CN',
  title: '云禾管理系统',
  description: 'Just playing around.',
  head: [
    ['link', { rel: 'stylesheet', href: 'https://cdn.bootcdn.net/ajax/libs/lxgw-wenkai-webfont/1.6.0/style.min.css' }],
    ['link', { rel: 'icon', href: '/images/logo.png' }],
    // ['link', { rel: 'stylesheet', href: 'https://cdn.bootcdn.net/ajax/libs/lxgw-wenkai-screen-webfont/1.7.0/style.min.css' }]
  ],

  // 相对于项目根目录的 markdown 文件所在的文件夹
  srcDir: 'docs',
  // 项目的构建输出位置，相对于项目根目录
  outDir: 'dist',
  // 全局开启最后更新时间
  lastUpdated: true,

  themeConfig: {
    logo: '/images/logo.png',
    nav: navbar,
    sidebar: sidebar,
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    returnToTopLabel: '返回顶部',
    outlineTitle: '页面导航',
    outline: 'deep',
    lastUpdated: {
      text: '最近更新',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ace627/YunHe-Vue' },
      { icon: 'gitee', link: 'https://gitee.com/decade9527/YunHe-Vue' },
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '重置搜索',
                noResultsText: '没有结果',
                footer: {
                  selectText: '选择',
                  navigateText: '导航',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    footer: {
      // message: 'Released under the MIT License.',
      // copyright: 'Copyright © 2026-present 当时只道是寻常',
      copyright: 'MIT Licensed | Copyright © 2026-present 当时只道是寻常',
    },
  },

  vite: {
    // 因为 srcDir = 'docs'，public 目录需要相对于 docs 向上找一级到根目录
    publicDir: '../public',
    server: {
      port: 8080,
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // 忽略来自 @vueuse/core 的 pure 注释警告
          if (warning.code === 'PURE_COMMENT_IGNORED' && warning.message.includes('@vueuse/core')) {
            return
          }
          warn(warning)
        },
      },
    },
  },
})
