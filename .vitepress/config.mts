import { defineConfig } from 'vitepress'
import { navbar, sidebar } from './router'
import vite from '../vite.config'

export default defineConfig({
  // 站点级选项
  lang: 'zh-CN',
  title: 'NestJS Admin Template',
  description: '基于 Vue 3 + NestJS 11 全 TypeScript 技术栈的中后台管理系统模板',
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
      { icon: 'github', link: 'https://github.com/Ace627/nestjs-admin-template' },
      { icon: 'gitee', link: 'https://gitee.com/decade9527/nestjs-admin-template' },
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
      copyright: 'MIT Licensed | Copyright © 2026-present 当时只道是寻常',
    },
  },

  vite,
})
