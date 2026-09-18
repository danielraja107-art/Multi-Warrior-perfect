import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@storm-arena/shared': fileURLToPath(
        new URL('../shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/matchmake': {
        target: 'ws://localhost:2567',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
  },
});