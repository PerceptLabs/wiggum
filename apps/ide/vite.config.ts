/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Serve /preview/* from public/preview/ BEFORE SPA fallback
    {
      name: 'serve-preview-static',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/preview')) {
            // Map /preview/ to /preview/index.html
            let filePath = req.url.split('?')[0] // Remove query string
            if (filePath === '/preview' || filePath === '/preview/') {
              filePath = '/preview/index.html'
            }

            const fullPath = path.join(__dirname, 'public', filePath)

            if (fs.existsSync(fullPath)) {
              const content = fs.readFileSync(fullPath)
              const ext = path.extname(fullPath)
              const mimeTypes: Record<string, string> = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
              }
              res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
              res.end(content)
              return
            }
          }
          next()
        })
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'path': 'path-browserify',
    },
  },
  optimizeDeps: {
    exclude: ['esbuild-wasm'],
  },
  build: {
    // Don't bundle esbuild-wasm, it needs to load its own worker
    commonjsOptions: {
      exclude: ['esbuild-wasm'],
    },
  },
  // Allow importing from workspace packages and node_modules
  server: {
    fs: {
      // Allow serving files from:
      // - The IDE app itself
      // - Parent directories (for monorepo packages)
      // - node_modules
      allow: [
        '..',                      // apps/
        '../..',                   // monorepo root
        '../../packages',          // packages/ directory
        '../../node_modules',      // root node_modules
      ],
    },
  },
  define: {
    'process.env': {},
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
