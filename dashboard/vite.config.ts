import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: '/',
  },
  // Force the dev server to pre-bundle all @dnd-kit packages together in
  // one chunk so they share the same React instance. Without this, adding
  // a new @dnd-kit/* package while the dev server is running can land it
  // in a separate optimized bundle with its own React reference, causing
  // "Invalid hook call" + "Cannot read properties of null (reading
  // 'useContext')" crashes from inside SortableContext.
  optimizeDeps: {
    include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  },
});
