import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Politique de sécurité du contenu (CSP) injectée dans index.html à la compilation uniquement
 * (le mode dev de Vite utilise des scripts inline). Les en-têtes HTTP de render.yaml la complètent
 * (frame-ancestors, HSTS…) : une balise <meta> ne peut pas les porter.
 */
function cspPlugin(apiOrigin: string): Plugin {
  const connect = ["'self'", apiOrigin].filter(Boolean).join(' ')
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src ${connect}`,
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'monpermis-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:5001'

  return {
    plugins: [react(), cspPlugin(String(env.VITE_API_URL || '').trim().replace(/\/$/, ''))],
    server: {
      host: '0.0.0.0',
      port: 5175,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
