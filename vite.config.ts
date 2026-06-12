import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Inject model names only — NO API keys exposed to browser
      {
        name: 'inject-safe-env',
        transformIndexHtml(html) {
          const safeEnv: Record<string, string> = {}
          const safeKeys = ['NVIDIA_MODEL', 'OPENAI_MODEL', 'ANTHROPIC_MODEL', 'OLLAMA_MODEL', 'PORT']
          for (const key of safeKeys) {
            if (env[key]) safeEnv[key] = env[key]
          }
          const envScript = `<script>window.__ENV_SERVER=${JSON.stringify(safeEnv)};</script>`
          return html.replace('</body>', `${envScript}</body>`)
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 8080,
      proxy: {
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nvidia/, ''),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              if (env.NVIDIA_API_KEY) {
                proxyReq.setHeader('Authorization', `Bearer ${env.NVIDIA_API_KEY}`)
              }
            })
          },
        },
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any, req: any) => {
              const auth = req.headers['authorization']
              if (auth) proxyReq.setHeader('authorization', auth)
            })
          },
        },
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any, req: any) => {
              const key = req.headers['x-api-key']
              if (key) proxyReq.setHeader('x-api-key', key)
            })
          },
        },
      },
    },
  }
})