// Vite build of COMP-01. `vite build --mode test` produces the test build with the hooks of
// SAD §4.1.6 (window.__wbTest); the normal build never contains them.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.WB_API_URL || 'http://127.0.0.1:4000';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': API,
      '/socket.io': { target: API, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: mode === 'test' },
}));
