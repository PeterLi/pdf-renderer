import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true, // Listen on all network interfaces (LAN access)
    port: 5176,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: ['pdfjs-dist/build/pdf.worker.min.mjs'],
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
});
