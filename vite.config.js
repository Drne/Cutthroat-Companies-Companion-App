import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/cutthroat-companies/', // base path for GitHub Pages project site
  plugins: [react()],
})
