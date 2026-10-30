import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The router plugin generates src/routeTree.gen.ts from src/routes and must run before React
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  // #/ points at src/, matching the paths entry in tsconfig.app.json
  resolve: {
    alias: [{ find: /^#\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
