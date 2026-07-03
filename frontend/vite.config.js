import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set this in frontend/.env or .env.local when your backend runs on a non-default port.
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
