import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 👈 Tailwind CSS v4 Vite compilation plugin
  ],
  server: {
    port: 3000,
    proxy: {
      // Proxies frontend API calls to our Spring Boot backend running on 8081
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
