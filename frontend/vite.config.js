import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5001,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/books': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/categories': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/loans': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/fines': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})