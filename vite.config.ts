import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA désactivée temporairement : les anciens service workers
// bloquaient les clients sur de vieux bundles (bannière cassée).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
