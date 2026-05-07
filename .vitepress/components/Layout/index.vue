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
  return 'startViewTransition' in document && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

/**
 * 自定义深色模式切换函数
 * 利用 ViewTransition API 实现从点击位置扩散的圆形裁剪动画
 * @param event 鼠标点击事件，用于获取动画圆心
 */
async function toggleAppearance(event: MouseEvent) {
  const { clientX: x, clientY: y } = event
  // 不支持过渡动画时，直接切换
  if (!enableTransitions()) {
    isDark.value = !isDark.value
    return
  }
  // 计算裁剪圆的最终半径（保证覆盖整个页面）
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  // 从小圆(0)到大圆(radius)的裁剪路径
  const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]
  // 开始视图过渡
  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick() // 确保 Vue 完成 DOM 更新
  })
  // 等待过渡准备好后，为伪元素添加裁剪动画
  await transition.ready
  // 若切换到深色模式，旧视图使用大圆 -> 小圆；新视图反之
  // 为视图过渡的旧/新快照的根伪元素添加动画
  const easing = 'cubic-bezier(0.28, 0, 0.44, 1)' // 苹果风格的动画曲线
  const pseudoElement = isDark.value ? '::view-transition-old(root)' : '::view-transition-new(root)'
  document.documentElement.animate({ clipPath: isDark.value ? clipPath.reverse() : clipPath }, { duration: 500, easing, fill: 'forwards', pseudoElement })
}

// 向子组件提供主题切换方法
provide('toggle-appearance', toggleAppearance)
</script>
