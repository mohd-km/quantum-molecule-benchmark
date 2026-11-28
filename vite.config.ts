import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import scopeModules from './scope-css.js';

export default defineConfig({
  plugins: [react()],
  base: '/',
  css: { postcss: { plugins: [scopeModules()] } },
  build: { chunkSizeWarningLimit: 900 },
});
