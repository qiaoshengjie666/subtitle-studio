import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Electron 打包版通过 file:// 打开 index.html；资源必须使用相对路径，
  // 否则 /assets/... 会被解析到磁盘根目录而导致渲染进程黑屏。
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
