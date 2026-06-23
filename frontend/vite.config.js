import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/get-routes': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/process-routes': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/save-route': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/history': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/analytics': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/weather': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/chatbot': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/geo-guide': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/analyze-mood': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/generate-trip': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
  },
});
