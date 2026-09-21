import type { DefaultTheme } from 'vitepress'

// https://vitepress.dev/zh/reference/default-theme-sidebar
// 对象写法是多侧边栏模式 https://vitepress.dev/zh/reference/default-theme-sidebar#multiple-sidebars
export const sidebar: DefaultTheme.Sidebar = {
  '/guide/': [
    {
      text: '文档',
      items: [
        { text: '简介', link: '/guide/introduction' },
        { text: '环境部署', link: '/guide/quick-start' },
        { text: '项目介绍', link: '/guide/project' },
        {
          text: '前端手册',
          link: '/guide/tip-modal',
          collapsed: true,
          items: [
            { text: '提示弹窗', link: '/guide/tip-modal' },
            { text: '本地缓存', link: '/guide/storage-cache' },
            { text: '图标使用', link: '/guide/svg-icon' },
            { text: '动态标题', link: '/guide/dynamic-title' },
            { text: '字典使用', link: '/guide/dict-use' },
            { text: '全局组件', link: '/guide/global-component' },
            { text: '组件文档', link: '/guide/components' },
          ],
        },
        {
          text: '后台手册',
          link: '/guide/crud',
          collapsed: true,
          items: [
            { text: '增删改查', link: '/guide/crud' },
            { text: '导入导出', link: '/guide/excel' },
            { text: '上传下载', link: '/guide/upload-download' },
            { text: '系统日志', link: '/guide/system-log' },
            { text: '数据权限', link: '/guide/data-scope' },
            { text: '定时任务', link: '/guide/job' },
            { text: '演示模式', link: '/guide/demo' },
            { text: '异常处理', link: '/guide/exception' },
            { text: '参数验证', link: '/guide/validation' },
            { text: '接口限流', link: '/guide/throttle' },
            { text: '防重复提交', link: '/guide/repeat-submit' },
            { text: '登录失败锁定', link: '/guide/login-lock' },
          ],
        },
        { text: '更新日志', link: '/guide/changelog' },
      ],
    },
    {
      text: '其它',
      items: [
        {
          text: '常见问题',
          link: '/guide/faq',
          collapsed: true,
          items: [
            { text: '如何新增系统图标', link: '/guide/faq#如何新增系统图标' },
            { text: '如何调整左侧菜单宽度', link: '/guide/faq#如何调整左侧菜单宽度' },
            { text: '如何更换后端请求地址', link: '/guide/faq#如何更换后端请求地址' },
            { text: '如何设置接口的超时时间', link: '/guide/faq#如何设置接口的超时时间' },
          ],
        },
        { text: '常用脚本', link: '/guide/scripts' },
        { text: '捐赠支持', link: '/guide/donate' },
      ],
    },
  ],
}
