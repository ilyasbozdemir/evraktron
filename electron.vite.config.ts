import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/main.js')
      }
    } as any
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload.js')
      }
    } as any
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [react()],
    root: 'src/renderer',
    publicDir: resolve(__dirname, 'public')
  }
});
