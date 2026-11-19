import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, la API del Worker de Wrangler escucha en 8787.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
