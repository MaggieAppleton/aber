import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('./web', import.meta.url)), plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true,
    proxy: Object.fromEntries(['/api', '/media', '/healthz'].map(path => [path, process.env.ABER_API_TARGET || 'http://127.0.0.1:3000'])) },
  build: { outDir: 'dist', emptyOutDir: true },
});
