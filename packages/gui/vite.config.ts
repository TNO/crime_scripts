import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/crime_scripts/' : '/',
  plugins: [wasm()],
  server: {
    port: 3498,
  },
  build: {
    outDir: '../../docs',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: true,
  },
}));
