import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite's dev server blocks requests from hostnames it doesn't
    // recognize by default. Since we're testing through a Cloudflare
    // Tunnel (a random *.trycloudflare.com hostname, not localhost),
    // we need to explicitly allow it here or the browser gets a
    // "Blocked request. This host is not allowed" error.
    allowedHosts: ['.trycloudflare.com'],
  },
})
