import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Cargar env vars basado en el mode
  const env = loadEnv(mode, process.cwd(), '')
  
  // Configuración base
  const config = {
    plugins: [react()],
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  }

  // Solo definir VITE_API_URL en producción
  if (mode === 'production') {
    config.define = {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://samugoja1.pythonanywhere.com/api')
    }
    console.log('🚀 Configuración PRODUCCIÓN - API URL:', env.VITE_API_URL || 'https://samugoja1.pythonanywhere.com/api')
  } else {
    console.log('🔧 Configuración DESARROLLO - API URL:', env.VITE_API_URL || 'http://localhost:8000/api')
  }

  return config
})