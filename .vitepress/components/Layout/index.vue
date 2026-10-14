<template>
  <Layout> </Layout>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { nextTick, provide } from 'vue'

const { isDark } = useData()
const { Layout } = DefaultTheme

/**
 * 检测浏览器是否支持并允许视图过渡动画
 * 要求：支持 ViewTransition API，且用户未开启“减少动画”偏好
 */
function enableTransitions(): boolean {
  return typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 最近一次切换动效的序号：快速连续切换时仅让最后一次 transition 的清理生效，避免旧动画清掉新动画的变量 */
let latestTransitionId = 0

/**
 * 自定义深色模式切换函数
 * 与参考项目 useTheme.ts 同款架构：JS 仅注入圆心与半径的百分比 CSS 变量，
 * 并用 data-theme-transition 标记方向，动画本体由全局样式的 keyframes 纯 CSS 驱动，
 * 实现从点击位置扩散的圆形裁剪动画
 * @param event 鼠标点击事件，用于获取动画圆心；键盘触发或缺省时从屏幕中心扩散
 */
function toggleAppearance(event?: MouseEvent) {
  const next = !isDark.value
  // 不支持过渡动画时，直接切换
  if (!enableTransitions()) {
    isDark.value = next
    return
  }

  const root = document.documentElement
  // 键盘触发（event.detail 为 0）时坐标无效，退回屏幕中心
  const hasPointer = event && event.detail > 0
  const x = hasPointer ? event.clientX : innerWidth / 2
  const y = hasPointer ? event.clientY : innerHeight / 2
  // 计算裁剪圆的最终半径（保证覆盖整个页面）
  const endRadius = Math.hypot(Math.max(x, 0, innerWidth - x), Math.max(y, 0, innerHeight - y))

  // 与 Element Plus 官网一致：圆心与半径均归一化为百分比，动画 keyframes 依赖这三个变量与方向标记
  root.dataset.themeTransition = next ? 'to-dark' : 'to-light'
  root.style.setProperty('--theme-transition-x', `${(100 * x) / innerWidth}%`)
  root.style.setProperty('--theme-transition-y', `${(100 * y) / innerHeight}%`)
  root.style.setProperty('--theme-transition-radius', `${(100 * endRadius) / (Math.hypot(innerWidth, innerHeight) / Math.SQRT2)}%`)

  const transitionId = ++latestTransitionId
  const transition = document.startViewTransition(async () => {
    isDark.value = next
    await nextTick() // 确保 Vue 完成 DOM 更新
  })

  transition.finished
    .finally(() => {
      // 快速连续切换时仅让最后一次 transition 的清理生效
      if (transitionId !== latestTransitionId) return
      delete root.dataset.themeTransition
      root.style.removeProperty('--theme-transition-x')
      root.style.removeProperty('--theme-transition-y')
      root.style.removeProperty('--theme-transition-radius')
    })
    .catch(() => {}) // 过渡被跳过（如被新过渡接管）时 finished 可能 reject，静默处理
}

// 向子组件提供主题切换方法
provide('toggle-appearance', toggleAppearance)
</script>
