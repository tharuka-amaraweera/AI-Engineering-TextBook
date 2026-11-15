import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The chapter text is imported straight from the Markdown files one folder up,
// so the textbook stays the single source of truth.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5190, fs: { allow: ['..'] } },
});
