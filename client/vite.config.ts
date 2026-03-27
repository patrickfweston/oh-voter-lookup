import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Public hostname (Cloudflare Tunnel). Listed hosts are allowed in addition to
 * Vite defaults (localhost, IPs). See cloudflared.example.yml at repo root.
 */
const ALLOWED_HOSTS = ['ohvoter.patrickfweston.com']

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ALLOWED_HOSTS,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3092',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
  preview: {
    allowedHosts: ALLOWED_HOSTS,
  },
})
