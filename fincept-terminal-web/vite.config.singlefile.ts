import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Produces one self-contained dist/index.html with all JS/CSS inlined —
// used to publish the terminal as a hosted Artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { outDir: 'dist-single', assetsInlineLimit: 100000000, cssCodeSplit: false, reportCompressedSize: false },
})
