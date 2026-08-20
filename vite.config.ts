import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// PWA désactivée temporairement : les anciens service workers
// bloquaient les clients sur de vieux bundles (bannière cassée).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:5001'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/content': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
