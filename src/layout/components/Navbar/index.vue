<template>
  <div class="navbar flex items-center relative">
    <!-- 侧栏折叠控制 -->
    <Hamburger class="navbar-item" v-if="appStore.isMobile || layout === 'classic'" @toggleClick="appStore.toggleSidebar" />
    <!-- 系统 Logo -->
    <AppLogo v-if="layout !== 'classic'" />
    <!-- 面包屑导航 -->
    <Breadcrumb v-if="appStore.isDesktop && layout === 'classic'" class="ml-8px" />
    <!-- 右侧水平菜单组件 -->
    <Sidebar class="ml-auto flex-1 flex justify-end" v-if="appStore.isDesktop && layout !== 'classic'" mode="horizontal" />

    <div class="right-nav h-full ml-auto flex-center">
      <UserDropDown class="navbar-item" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Navbar' })

import Hamburger from './Hamburger.vue'
import Breadcrumb from './Breadcrumb.vue'
import UserDropDown from './UserDropDown.vue'
import { AppLogo, Sidebar } from '@/layout/components'

const appStore = useAppStore()
const { layout } = storeToRefs(useSettingStore())
</script>

<style lang="scss" scoped>
.navbar {
  --el-menu-horizontal-height: var(--ap-navbar-height);
  --el-menu-item-height: var(--ap-navbar-height);
  --el-menu-text-color: var(--el-text-color-regular);
  --el-menu-base-level-padding: 8px;
  --el-menu-hover-text-color: var(--ap-sidebar-active-color);
  --el-menu-hover-bg-color: none;
  height: var(--ap-navbar-height);
  background-color: rgba($color: #fff, $alpha: 0.4);
  backdrop-filter: blur(4px);
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

/* 菜单项的通用样式 */
.navbar-item {
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  transition: background-color var(--el-transition-duration-fast);
  &:hover {
    background-color: rgba(0, 21, 41, 0.08);
  }
}

.el-text + .el-text {
  margin-left: 8px;
}

.time {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  text-align: center;
}
</style>
