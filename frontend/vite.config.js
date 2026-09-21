import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Frontend calls /api/... and Vite forwards to Express (no CORS issues in dev)
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
