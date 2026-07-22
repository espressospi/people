import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    strictPort: false,
    proxy: {
      '/graphql': `http://127.0.0.1:${process.env.API_PORT || 4000}`,
    },
  },
})
