import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/BraingrowAI/',
  server: {
    proxy: {
      '/api': {
        target: 'https://braingrow-ai-backend-75904341630.australia-southeast1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
