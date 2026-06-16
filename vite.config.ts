/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const LOCAL_TARGET = `http://localhost:${env.PORT || 3000}`

// Helper: configure proxy with X-Forwarded-Host so backend can set correct cookie Domain
function proxyBackend(path: string) {
  return {
    target: LOCAL_TARGET,
    changeOrigin: true,
    configure: (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any, req: any) => {
        // Forward the browser's actual host so backend sets Domain on Set-Cookie correctly
        proxyReq.setHeader('x-forwarded-host', req.headers['host'])
      })
    },
  }
}

return {
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api/auth/me':         proxyBackend('/api/auth/me'),
      '/api/chat':            proxyBackend('/api/chat'),
      '/api/auth/login':      proxyBackend('/api/auth/login'),
      '/api/auth/status':     proxyBackend('/api/auth/status'),
      '/api/summarize':       proxyBackend('/api/summarize'),
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
              if (key) proxyReq.setHeader('x-api-key', key as string)
            })
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'vendor'
              if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'markdown'
            }
          },
        },
      },
      chunkSizeWarningLimit: 300,
    },
  }
})