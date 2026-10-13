import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: './',
  esbuild: { loader: 'tsx', include: /src\/.*\.tsx?$/ },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.ts': 'tsx' },
    },
  },
})
