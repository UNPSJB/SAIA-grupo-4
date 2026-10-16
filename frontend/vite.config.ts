import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // En desarrollo el frontend habla contra su propio origen (`/api`) y Vite
  // reenvía al backend. Así la cookie httpOnly de refresh es de primera parte
  // y viaja siempre: evita el bloqueo de SameSite=Lax cuando la app corre en
  // localhost:5173 y el backend vive en 127.0.0.1:8000 (sitios distintos).
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})
