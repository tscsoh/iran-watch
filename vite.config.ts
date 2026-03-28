import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 7474,
    proxy: {
      '/proxy': {
        target: 'http://localhost:7475',
        rewrite: path => path,
      },
    },
  },
  preview: {
    port: 7474,
  },
});
