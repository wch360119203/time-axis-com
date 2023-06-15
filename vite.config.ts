import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/timeAxis',
  build: {
    target: 'ES2015',
    sourcemap: true,
    lib: {
      entry: './src/TimeAxis.ts',
      name: 'time-axis',
      fileName: 'timeAxis',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['@antv/g', '@antv/g-canvas', 'dayjs', 'lodash'],
      output: {
        globals: {
          '@antv/g': 'G',
          '@antv/g-canvas': 'GCanvas',
          dayjs: 'dayjs',
          lodash: '_'
        }
      }
    }
  },
  plugins: [vue(), dts({ outputDir: './dist/types' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
