import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Cutthroat-Companies-Companion-App/', // base path for GitHub Pages project site
  plugins: [react()],
})
