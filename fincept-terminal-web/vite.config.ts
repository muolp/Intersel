import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FinceptTerminal Web build config.
// The /api/yahoo proxy lets the browser fetch free Yahoo Finance data without
// hitting CORS: the dev server forwards these requests server-side. This makes
// LIVE market data work under `npm run dev`. (Static/preview builds and the
// hosted Artifact have no proxy, so the app falls back to the simulator.)
const yahoo = {
  target: 'https://query1.finance.yahoo.com',
  changeOrigin: true,
  secure: true,
  rewrite: (p: string) => p.replace(/^\/api\/yahoo/, ''),
  headers: {
    // Yahoo rejects requests without a browser-like UA.
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
  },
}

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, proxy: { '/api/yahoo': yahoo } },
  preview: { host: true, port: 4173, proxy: { '/api/yahoo': yahoo } },
  base: './',
})
