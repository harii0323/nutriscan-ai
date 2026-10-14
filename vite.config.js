import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/firestore/i.test(id)) {
            return 'vendor-firestore';
          }
          if (/auth/i.test(id) && (id.includes('firebase') || id.includes('@firebase'))) {
            return 'vendor-firebase-auth';
          }
          if (id.includes('firebase') || id.includes('@firebase')) {
            return 'vendor-firebase-core';
          }
          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
