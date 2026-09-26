import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/crime_scripts/' : '/',
  plugins: [wasm()],
  server: {
    port: 3498,
  },
  build: {
    // Preserve the browser floor used before Vite 8 raised its default target.
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    outDir: '../../docs',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: true,
  },
}));
