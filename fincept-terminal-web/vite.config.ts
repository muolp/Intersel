import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FinceptTerminal Web build config.
// /api/yahoo and /api/yahoo2 proxy to Yahoo's two chart hosts (query1/query2)
// server-side, so the browser can fetch free Yahoo Finance data without CORS.
// LIVE data therefore works under `npm run dev` / `npm run preview`. Static/hosted
// builds and the sandboxed Artifact have no proxy and fall back to the simulator.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const headers = { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' }
const mk = (host: string, prefix: RegExp) => ({
  target: `https://${host}`, changeOrigin: true, secure: true,
  rewrite: (p: string) => p.replace(prefix, ''), headers,
})
const proxy = {
  '/api/yahoo2': mk('query2.finance.yahoo.com', /^\/api\/yahoo2/),
  '/api/yahoo': mk('query1.finance.yahoo.com', /^\/api\/yahoo/),
}

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, proxy },
  preview: { host: true, port: 4173, proxy },
  base: './',
})
