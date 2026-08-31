import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_MODULE': JSON.stringify('admin'),
  },
  plugins: [react()],
  server: {
    port: 5175,
  },
  build: {
    outDir: 'dist-admin',
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  },
});
