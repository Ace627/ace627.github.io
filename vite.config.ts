import { defineConfig } from 'vite'

/**
 * Vite 定制配置，由 .vitepress/config.mts 引入。
 * 注意：VitePress 下 Vite 的实际 root 是 srcDir（docs/），
 * publicDir 等相对路径均相对 docs/ 解析。
 */
export default defineConfig({
  // 因为 srcDir = 'docs'，public 目录需要相对于 docs 向上找一级到根目录
  publicDir: '../public',
  server: {
    host: true,
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
})
