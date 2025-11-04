import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Cargar env vars basado en el mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    // Forzar la definición de la variable
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://fantasy-y4dl.onrender.com/api')
    }
  }
})