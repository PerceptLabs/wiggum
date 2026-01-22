/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  // Serve the esbuild-wasm files from node_modules
  server: {
    fs: {
      allow: ['..', '../../node_modules'],
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
