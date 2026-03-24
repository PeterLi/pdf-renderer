import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
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
