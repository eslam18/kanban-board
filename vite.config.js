import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'src/client',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../dist',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    root: '.',
  },
});
