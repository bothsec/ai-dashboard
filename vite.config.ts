/* eslint-disable @typescript-eslint/no-explicit-any */
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
              if (key) proxyReq.setHeader('x-api-key', key as string)
            })
          },
        },
        '/api/chat': {
          target: `http://localhost:${env.PORT || 3000}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/chat/, '/api/chat'),
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