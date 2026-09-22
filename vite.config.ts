import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Relative base + HashRouter, so one build works both at
// https://<user>.github.io/hr-shoe-mart/ and on a custom domain.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
